import { AST, Parser } from "node-sql-parser";
import { TableDefinitionNames } from "../indexer";
import { PostgresRow, WhereClauseMulti, WhereClauseSingle } from "./dml-handler";
import { DmlHandlerI } from "./dml-handler";

interface TableSpecification {
  tableName: string
  columnNames: string[]
  primaryKeyColumns: string[]
  serialColumns: string[]
}

class PostgresRowEntity {
  data: PostgresRow;
  private primaryKeys: string[];

  constructor(data: any, primaryKeys: string[]) {
    this.data = data;
    this.primaryKeys = primaryKeys.sort();

    // TODO: Verify value of primary key as well (if primary key is NOT NULL)
    if (!primaryKeys.every(primaryKey => {
      return primaryKey in data;
    })) {
      throw new Error('Inserted row must specify value for primary key columns');
    }
  }

  primaryKey(): string {
    return JSON.stringify(
      this.primaryKeys.reduce((acc, key) => {
        acc[key] = this.data[key];
        return acc;
      }, {} as Record<string, any>)
    );
  }

  isEqualRow(row: PostgresRow): boolean {
    return this.primaryKeys.every(primaryKey => {
      return row[primaryKey] === this.data[primaryKey];
    });
  }

  isEqualEntity(entity: PostgresRowEntity): boolean {
    return this.primaryKey() === entity.primaryKey();
  }

  isEqualCriteria(criteria: WhereClauseMulti): boolean {
    return Object.keys(criteria).every(attribute => {
      const toMatchValue = criteria[attribute];
      if (Array.isArray(toMatchValue)) {
        return toMatchValue.includes(this.data[attribute]);
      }
      return toMatchValue === this.data[attribute];
    });
  }

  update(updateObject: PostgresRow): void {
    Object.keys(updateObject).map(updateKey => {
      this.data[updateKey] = updateObject[updateKey];
    });
  }
}

class TableData {
  specification: TableSpecification;
  data: PostgresRowEntity[];
  serialCounter: Map<string, number>;

  constructor(tableSpec: TableSpecification) {
    this.specification = tableSpec;
    this.data = [];
    this.serialCounter = new Map();
  }

  public getEntitiesByCriteria(criteria: WhereClauseMulti, limit: number | null): PostgresRowEntity[] {
    const matchedRows: PostgresRowEntity[] = [];
    this.data.map(row => {
      if (row.isEqualCriteria(criteria)) {
        if (!limit || (limit && matchedRows.length <= limit)) {
          matchedRows.push(row);
        }
      }
    });
    return matchedRows;
  }

  private getSerialValue(columnName: string): number {
    const serialCounterKey = `${this.specification.tableName}-${columnName}`;
    let counterValue: number = this.serialCounter.get(serialCounterKey) ?? 0;
    this.serialCounter.set(serialCounterKey, counterValue + 1);
    return counterValue;
  }

  private fillSerialValues(row: PostgresRow): void {
    for (const serialColumnName of this.specification.serialColumns) {
      if (row[serialColumnName] === undefined) {
        row[serialColumnName] = this.getSerialValue(serialColumnName);
      }
    }
  }

  private createEntityFromRow(row: PostgresRow): PostgresRowEntity {
    // TODO: Also fill default values
    // TODO: Assert non null values
    const rowCopy = { ...row };
    this.fillSerialValues(rowCopy);
    return new PostgresRowEntity(rowCopy, this.specification.primaryKeyColumns);
  }

  public rowIsUnique(otherRow: PostgresRow): boolean {
    return this.data.every(entity => {
      return !entity.isEqualRow(otherRow);
    });
  }

  private entityIsUnique(otherEntity: PostgresRowEntity): boolean {
    return this.data.every(entity => {
      return !entity.isEqualEntity(otherEntity);
    });
  }

  public insertRow(row: PostgresRow): PostgresRowEntity {
    const entity: PostgresRowEntity = this.createEntityFromRow(row);
    if (!this.entityIsUnique(entity)) {
      throw new Error('Cannot insert row twice into the same table');
    }

    this.data.push(entity);
    return entity;
  }

  public insertEntity(entity: PostgresRowEntity): PostgresRowEntity {
    if (!this.entityIsUnique(entity)) {
      throw new Error('Cannot insert row twice into the same table');
    }

    this.data.push(entity);
    return entity;
  }

  public removeEntitiesByCriteria(criteria: WhereClauseMulti): PostgresRowEntity[] {
    const remainingRows: PostgresRowEntity[] = [];
    const matchedRows: PostgresRowEntity[] = [];
    this.data.map(entity => {
      if (entity.isEqualCriteria(criteria)) {
        matchedRows.push(entity)
      } else {
        remainingRows.push(entity);
      }
    });
    this.data = remainingRows;
    return matchedRows;
  }
}

class IndexerData {
  tables: Map<string, TableData>;

  constructor(schema: AST[]) {
    this.tables = this.initializeTables(schema);
  }

  private initializeTables(schemaAST: AST[]): Map<string, TableData> {
    const tables: Map<string, TableData> = new Map();
    for (const statement of schemaAST) {
      if (statement.type === "create" && statement.keyword === "table") {
        const tableSpec = this.createTableSpecification(statement);
        tables.set(tableSpec.tableName, new TableData(tableSpec));
      }
    }

    return tables;
  }

  private createTableSpecification(createTableStatement: any): TableSpecification {
    const tableName = createTableStatement.table[0].table;
    const columnNames: string[] = [];
    const primaryKeyColumns: string[] = [];
    const serialColumns: string[] = [];

    for (const columnDefinition of createTableStatement.create_definitions ?? []) {
      if (columnDefinition.column) {
        const columnName = this.getColumnName(columnDefinition);
        columnNames.push(columnName);

        const dataType = columnDefinition.definition.dataType as string;
        if (dataType.toUpperCase().includes('SERIAL')) {
          serialColumns
            .push(columnName);
        }

      } else if (columnDefinition.constraint && columnDefinition.constraint_type === "primary key") {
        for (const primaryKey of columnDefinition.definition) {
          primaryKeyColumns.push(primaryKey.column.expr.value);
        }
      }
    }
    const tableSpec: TableSpecification = {
      tableName,
      columnNames,
      primaryKeyColumns,
      serialColumns,
    };

    return tableSpec;
  }

  private getColumnName(columnDefinition: any): string {
    if (columnDefinition.column?.type === 'column_ref') {
      return columnDefinition.column.column.expr.value;
    }
    return "";
  }

  private selectColumnsFromRow(row: PostgresRow, columnsToSelect: string[]): PostgresRow {
    return columnsToSelect.reduce((newRow, columnName) => {
      newRow[columnName] = columnName in row ? row[columnName] : undefined;
      return newRow;
    }, {} as PostgresRow);
  }

  private getTableData(tableName: string): TableData {
    const tableData = this.tables.get(tableName);
    if (!tableData) {
      throw new Error('Invalid table name provided');
    }

    return tableData;
  }

  public select(tableName: string, criteria: WhereClauseMulti, limit: number | null): PostgresRow[] {
    const tableData = this.getTableData(tableName);
    return tableData.getEntitiesByCriteria(criteria, limit).map(entity => entity.data);
  }

  public insert(tableName: string, rowsToInsert: PostgresRow[]): PostgresRow[] {
    // TODO: Check types of columns
    // TODO: Verify columns are correctly named, and have any required values
    // TODO: Verify inserts are unique before actual insertion
    const tableData = this.getTableData(tableName);
    const insertedRows: PostgresRowEntity[] = [];

    for (const row of rowsToInsert) {
      if (!tableData.rowIsUnique(row)) {
        throw new Error('Cannot insert row twice into the same table');
      }
      insertedRows.push(tableData.insertRow(row));
    }

    return insertedRows.map(entity => entity.data);
  }

  public update(tableName: string, criteria: WhereClauseSingle, updateObject: PostgresRow): PostgresRow[] {
    // TODO: Validate criteria passed in has valid column names
    const tableData = this.getTableData(tableName);
    const updatedRows: PostgresRowEntity[] = [];

    const matchedRows = tableData.removeEntitiesByCriteria(criteria);
    for (const rowEntity of matchedRows) {
      rowEntity.update(updateObject);
      updatedRows.push(tableData.insertEntity(rowEntity));
    }

    return updatedRows.map(entity => entity.data);
  }

  public upsert(tableName: string, rowsToUpsert: PostgresRow[], conflictColumns: string[], updateColumns: string[]): PostgresRow[] {
    // TODO: Verify conflictColumns is a superset of primary key set (For uniqueness constraint)
    const tableData = this.getTableData(tableName);
    const upsertedRows: PostgresRowEntity[] = [];

    for (const row of rowsToUpsert) {
      const updateCriteriaObject = this.selectColumnsFromRow(row, conflictColumns);
      const rowsMatchingUpdate = tableData.removeEntitiesByCriteria(updateCriteriaObject);

      if (rowsMatchingUpdate.length > 1) {
        throw new Error('Conflict update criteria cannot affect row twice');
      } else if (rowsMatchingUpdate.length == 1) {
        const matchedEntity = rowsMatchingUpdate[0];
        if (upsertedRows.some(upsertedEntity => upsertedEntity.isEqualEntity(matchedEntity))) {
          throw new Error('Conflict update criteria cannot affect row twice');
        }

        const updateObject = this.selectColumnsFromRow(row, updateColumns);
        matchedEntity.update(updateObject);
        upsertedRows.push(tableData.insertEntity(matchedEntity));
      } else {
        upsertedRows.push(tableData.insertRow(row));
      }
    }

    return upsertedRows.map(entity => entity.data);
  }

  public delete(tableName: string, deleteCriteria: WhereClauseMulti): PostgresRow[] {
    const tableData = this.getTableData(tableName);
    return tableData.removeEntitiesByCriteria(deleteCriteria).map(entity => entity.data);
  }
}

export default class InMemoryDmlHandler implements DmlHandlerI {
  indexerData: IndexerData;

  constructor(schema: string) {
    const parser = new Parser();
    let schemaAST = parser.astify(schema, { database: 'Postgresql' });
    schemaAST = Array.isArray(schemaAST) ? schemaAST : [schemaAST]; // Ensure iterable
    this.indexerData = new IndexerData(schemaAST);
  }

  public async insert(tableDefinitionNames: TableDefinitionNames, rowsToInsert: PostgresRow[]): Promise<PostgresRow[]> {
    if (!rowsToInsert?.length) {
      return [];
    }

    return this.indexerData.insert(tableDefinitionNames.originalTableName, rowsToInsert);
  }

  public async select(tableDefinitionNames: TableDefinitionNames, whereObject: WhereClauseMulti, limit: number | null = null): Promise<PostgresRow[]> {
    return this.indexerData.select(tableDefinitionNames.originalTableName, whereObject, limit);
  }

  public async update(tableDefinitionNames: TableDefinitionNames, whereObject: WhereClauseSingle, updateObject: any): Promise<PostgresRow[]> {
    return this.indexerData.update(tableDefinitionNames.originalTableName, whereObject, updateObject);
  }


  public async upsert(tableDefinitionNames: TableDefinitionNames, rowsToUpsert: PostgresRow[], conflictColumns: string[], updateColumns: string[]): Promise<PostgresRow[]> {
    return this.indexerData.upsert(tableDefinitionNames.originalTableName, rowsToUpsert, conflictColumns, updateColumns);
  }

  public async delete(tableDefinitionNames: TableDefinitionNames, whereObject: WhereClauseMulti): Promise<PostgresRow[]> {
    return this.indexerData.delete(tableDefinitionNames.originalTableName, whereObject);
  }
}

