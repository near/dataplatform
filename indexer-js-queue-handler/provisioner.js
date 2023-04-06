import VError from 'verror';

import HasuraClient from './hasura-client.js';

export default class Provisioner {
    constructor(
        hasuraClient = new HasuraClient(),
    ) {
        this.hasuraClient = hasuraClient;
    }

    doesEndpointExist(schemaName) {
        return this.hasuraClient.isSchemaCreated(schemaName);
    }

    async createSchema(schemaName) {
        try {
            await this.hasuraClient.createSchema(schemaName);
        } catch (error) {
            throw new VError(error, `Failed to create schema`);
        }
    }

    async runMigrations(schemaName, migration) {
        try {
            await this.hasuraClient.runMigrations(schemaName, migration);
        } catch (error) {
            throw new VError(error, `Failed to run migrations`);
        }
    }

    async getTableNames(schemaName) {
        try {
            return await this.hasuraClient.getTableNames(schemaName);
        } catch (error) {
            throw new VError(error, `Failed to fetch table names`);
        }
    }

    async trackTables(schemaName, tableNames) {
        try {
            await this.hasuraClient.trackTables(schemaName, tableNames);
        } catch (error) {
            throw new VError(error, `Failed to track tables`);
        }
    }

    async addPermissionsToTables(schemaName, tableNames, roleName, permissions) {
        try {
            await this.hasuraClient.addPermissionsToTables(
                schemaName,
                tableNames,
                roleName,
                ['select', 'insert', 'update', 'delete']
            );
        } catch (error) {
            throw new VError(error, `Failed to add permissions to tables`);
        }
    }

    async createAuthenticatedEndpoint(schemaName, roleName, migration) {
        try {
            await this.createSchema(schemaName);

            await this.runMigrations(schemaName, migration);

            const tableNames = await this.getTableNames(schemaName);
            await this.trackTables(schemaName, tableNames);

            await this.addPermissionsToTables(schemaName, tableNames, roleName, ['select', 'insert', 'update', 'delete']);
        } catch (error) {
            throw new VError(
                {
                    cause: error,
                    info: {
                        schemaName,
                        roleName,
                        migration,
                    }
                },
                `Failed to provision endpoint`
            );
        }
    }
}
