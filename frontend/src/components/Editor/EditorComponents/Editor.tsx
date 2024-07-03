import { request, useInitialPayload } from 'near-social-bridge';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert } from 'react-bootstrap';
import { useDebouncedCallback } from 'use-debounce';

import primitives from '!!raw-loader!./primitives.d.ts';
import {
  CODE_FORMATTING_ERROR_MESSAGE,
  CODE_GENERAL_ERROR_MESSAGE,
  FORMATTING_ERROR_TYPE,
  SCHEMA_FORMATTING_ERROR_MESSAGE,
  SCHEMA_TYPE_GENERATION_ERROR_MESSAGE,
  TYPE_GENERATION_ERROR_TYPE,
} from '@/constants/Strings';
import { IndexerDetailsContext } from '@/contexts/IndexerDetailsContext';
import { useModal } from '@/contexts/ModalContext';
import { defaultCode, defaultSchema, defaultSchemaTypes, formatIndexingCode, formatSQL } from '@/utils/formatters';
import { getLatestBlockHeight } from '@/utils/getLatestBlockHeight';
import IndexerRunner from '@/utils/indexerRunner';
import { PgSchemaTypeGen } from '@/utils/pgSchemaTypeGen';
import { validateJSCode, validateSQLSchema } from '@/utils/validators';

import DeveloperToolsContainer from '../EditorViewContainer/DeveloperToolsContainer';
import EditorMenuContainer from '../EditorViewContainer/EditorMenuContainer';
import QueryAPIStorageManager from '../QueryApiStorageManager';
import { block_details } from './block_details';
import { FileSwitcher } from './FileSwitcher';
import { GlyphContainer } from './GlyphContainer';
import ResizableLayoutEditor from './ResizableLayoutEditor';

declare const monaco: any;
const INDEXER_TAB_NAME = 'indexer.js';
const SCHEMA_TAB_NAME = 'schema.sql';
const originalSQLCode = formatSQL(defaultSchema);
const originalIndexingCode = formatIndexingCode(defaultCode);
const pgSchemaTypeGen = new PgSchemaTypeGen();

const Editor: React.FC = (): ReactElement => {
  const { indexerDetails, isCreateNewIndexer } = useContext(IndexerDetailsContext);

  const storageManager = useMemo(() => {
    if (indexerDetails.accountId && indexerDetails.indexerName) {
      return new QueryAPIStorageManager(indexerDetails.accountId, indexerDetails.indexerName);
    } else return null;
  }, [indexerDetails.accountId, indexerDetails.indexerName]);

  const [error, setError] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string>(INDEXER_TAB_NAME);
  const [indexingCode, setIndexingCode] = useState<string>(originalIndexingCode);
  const [schema, setSchema] = useState<string>(originalSQLCode);
  const [cursorPosition, setCursorPosition] = useState<{ lineNumber: number; column: number }>({
    lineNumber: 1,
    column: 1,
  });

  const [schemaTypes, setSchemaTypes] = useState<string>(defaultSchemaTypes);
  const [monacoMount, setMonacoMount] = useState<boolean>(false);

  const initialHeights = storageManager ? storageManager.getDebugList() || [] : [];
  const [heights, setHeights] = useState<number[]>(initialHeights);

  const [diffView, setDiffView] = useState<boolean>(false);
  const [blockView, setBlockView] = useState<boolean>(false);
  const { openModal, showModal, data, message, hideModal } = useModal();

  const [isExecutingIndexerFunction, setIsExecutingIndexerFunction] = useState<boolean>(false);
  const { height, currentUserAccountId }: { height?: number; currentUserAccountId?: string } =
    useInitialPayload() || {};

  const [decorations, setDecorations] = useState<any[]>([]);

  const handleLog = (_: any, log: string, callback: () => void) => {
    if (log) console.log(log);
    if (callback) {
      callback();
    }
  };

  const indexerRunner = useMemo(() => new IndexerRunner(handleLog), []);
  const disposableRef = useRef<any>(null);
  const monacoEditorRef = useRef<any>(null);

  const parseGlyphError = (
    error?: { message: string },
    line?: { start: { line: number; column: number }; end: { line: number; column: number } },
  ) => {
    const { line: startLine, column: startColumn } = line?.start || { line: 1, column: 1 };
    const { line: endLine, column: endColumn } = line?.end || { line: 1, column: 1 };
    const displayedError = error?.message || 'No Errors';

    monacoEditorRef.current.deltaDecorations(
      [decorations],
      [
        {
          range: new monaco.Range(startLine, startColumn, endLine, endColumn),
          options: {
            isWholeLine: true,
            glyphMarginClassName: error ? 'glyphError' : 'glyphSuccess',
            glyphMarginHoverMessage: { value: displayedError },
          },
        },
      ],
    );
  };

  const debouncedValidateSQLSchema = useDebouncedCallback((_schema: string) => {
    const { error, location } = validateSQLSchema(_schema);
    error ? parseGlyphError(error as any, location as any) : parseGlyphError();
    return;
  }, 500);

  const debouncedValidateCode = useDebouncedCallback((_code: string) => {
    const { error: codeError } = validateJSCode(_code);
    codeError ? setError(CODE_FORMATTING_ERROR_MESSAGE) : setError(undefined);
  }, 500);

  const schemaErrorHandler = (schemaError: any): void => {
    if (schemaError?.type === FORMATTING_ERROR_TYPE) setError(SCHEMA_FORMATTING_ERROR_MESSAGE);
    if (schemaError?.type === TYPE_GENERATION_ERROR_TYPE) setError(SCHEMA_TYPE_GENERATION_ERROR_MESSAGE);
    return;
  };

  const indexerErrorHandler = (codeError: any): void => {
    if (codeError) setError(CODE_GENERAL_ERROR_MESSAGE);
    return;
  };

  useEffect(() => {
    //* Load saved code from local storage if it exists else load code from context
    const savedCode = storageManager?.getIndexerCode();
    if (savedCode) setIndexingCode(savedCode);
    else if (indexerDetails.code) {
      const { data: formattedCode, error: codeError } = validateJSCode(indexerDetails.code);
      if (codeError) setError(CODE_FORMATTING_ERROR_MESSAGE);
      formattedCode && setIndexingCode(formattedCode);
    }
    //* Load saved cursor position from local storage if it exists else set cursor to start
    const savedCursorPosition = storageManager?.getCursorPosition();
    if (savedCursorPosition) setCursorPosition(savedCursorPosition);

    if (monacoEditorRef.current && fileName === INDEXER_TAB_NAME) {
      monacoEditorRef.current.setPosition(savedCursorPosition || { lineNumber: 1, column: 1 });
      monacoEditorRef.current.focus();
    }
  }, [indexerDetails.code]);

  useEffect(() => {
    //* Load saved schema from local storage if it exists else load code from context
    const savedSchema = storageManager?.getSchemaCode();
    if (savedSchema) setSchema(savedSchema);
    else if (indexerDetails.schema) {
      const { data: formattedSchema, error: schemaError } = validateSQLSchema(indexerDetails.schema);
      schemaErrorHandler(schemaError);
      formattedSchema && setSchema(formattedSchema);
    }
  }, [indexerDetails.schema]);

  useEffect(() => {
    //* Revalidate code and schema on file switch
    const { error: schemaError } = validateSQLSchema(schema);
    const { error: codeError } = validateJSCode(indexingCode);
    if (schemaError) {
      schemaErrorHandler(schemaError);
      return;
    }
    if (codeError) {
      indexerErrorHandler(codeError);
      return;
    }
    handleCodeGen();
  }, [fileName]);

  useEffect(() => {
    //* Cache code and schema to local storage on change
    cacheToLocal();
  }, [indexingCode, schema]);

  useEffect(() => {
    if (!monacoEditorRef.current) return;

    const editorInstance = monacoEditorRef.current;
    editorInstance.onDidChangeCursorPosition(handleCursorChange);

    return () => {
      editorInstance.dispose();
    };
  }, [monacoEditorRef.current]);

  useEffect(() => {
    console.log('Editor useEffect 6');
    storageManager?.setSchemaTypes(schemaTypes);
    handleCodeGen();
  }, [schemaTypes, monacoMount]);

  useEffect(() => {
    console.log('Editor useEffect 7');
    storageManager?.setDebugList(heights);
  }, [heights]);

  const cacheToLocal = () => {
    if (!storageManager || !monacoEditorRef.current) return;

    storageManager.setSchemaCode(schema);
    storageManager.setIndexerCode(indexingCode);

    const newCursorPosition = monacoEditorRef.current.getPosition();
    if (fileName === INDEXER_TAB_NAME) storageManager.setCursorPosition(newCursorPosition);
  };

  const handleCursorChange = () => {
    if (monacoEditorRef.current && fileName === INDEXER_TAB_NAME) {
      const position = monacoEditorRef.current.getPosition();
      setCursorPosition(position);
    }
  };

  const attachTypesToMonaco = () => {
    // If types have been added already, dispose of them first
    if (disposableRef.current) {
      disposableRef.current.dispose();
      disposableRef.current = null;
    }

    if ((window as any).monaco) {
      // Add generated types to monaco and store disposable to clear them later
      const newDisposable = (window as any).monaco.languages.typescript.typescriptDefaults.addExtraLib(schemaTypes);
      if (newDisposable != null) {
        console.log('Types successfully imported to Editor');
      }

      disposableRef.current = newDisposable;
    }
  };

  const handleDeleteIndexer = () => {
    request('delete-indexer', {
      accountId: indexerDetails.accountId,
      indexerName: indexerDetails.indexerName,
    });
  };

  const reformatAll = (indexingCode: string, schema: string) => {
    const { data: validatedCode, error: codeError } = validateJSCode(indexingCode);
    const { data: validatedSchema, error: schemaError } = validateSQLSchema(schema);

    let formattedCode = validatedCode;
    let formattedSchema = validatedSchema;
    if (codeError) {
      formattedCode = indexingCode;
      setError(CODE_FORMATTING_ERROR_MESSAGE);
    } else if (schemaError?.type === FORMATTING_ERROR_TYPE) {
      formattedSchema = schema;
      setError(SCHEMA_FORMATTING_ERROR_MESSAGE);
    } else if (schemaError?.type === TYPE_GENERATION_ERROR_TYPE) {
      formattedSchema = schema;
      setError(SCHEMA_TYPE_GENERATION_ERROR_MESSAGE);
    } else {
      setError(undefined);
    }

    return { formattedCode, formattedSchema };
  };

  const handleCodeGen = () => {
    try {
      setSchemaTypes(pgSchemaTypeGen.generateTypes(schema));
      attachTypesToMonaco(); // Just in case schema types have been updated but weren't added to monaco
    } catch (_error) {
      console.error('Error generating types for saved schema.\n', _error);
      setError(SCHEMA_TYPE_GENERATION_ERROR_MESSAGE);
    }
  };

  const handleFormating = () => {
    const { formattedCode, formattedSchema } = reformatAll(indexingCode, schema);
    formattedCode && setIndexingCode(formattedCode);
    formattedSchema && setSchema(formattedSchema);
  };

  const handleEditorWillMount = (editor: any, monaco: any) => {
    console.log('monaco mount effect');
    if (!diffView) {
      const decorations = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(1, 1, 1, 1),
            options: {},
          },
        ],
      );
      monacoEditorRef.current = editor;
      setDecorations(decorations);

      editor.setPosition(fileName === INDEXER_TAB_NAME ? cursorPosition : { lineNumber: 1, column: 1 });
      editor.focus();
    }
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `${primitives}}`,
      'file:///node_modules/@near-lake/primitives/index.d.ts',
    );
    setMonacoMount(true);
  };

  const executeIndexerFunction = async (option = 'latest', startingBlockHeight: number | null = null) => {
    setIsExecutingIndexerFunction(() => true);
    const accountId = indexerDetails?.accountId ?? '';
    const indexerName = indexerDetails?.indexerName ?? '';
    const schemaName = accountId.concat('_', indexerName).replace(/[^a-zA-Z0-9]/g, '_');

    let latestHeight;
    switch (option) {
      case 'debugList':
        await indexerRunner.executeIndexerFunctionOnHeights(heights, indexingCode, schema, schemaName);
        break;
      case 'specific':
        if (startingBlockHeight === null && Number(startingBlockHeight) === 0) {
          console.log('Invalid Starting Block Height: starting block height is null or 0');
          break;
        }

        await indexerRunner.start(startingBlockHeight, indexingCode, schema, schemaName, option);
        break;
      case 'latest':
        latestHeight = await getLatestBlockHeight();
        if (latestHeight) await indexerRunner.start(latestHeight - 10, indexingCode, schema, schemaName, option);
    }
    setIsExecutingIndexerFunction(() => false);
  };

  const handleOnChangeSchema = (_schema: string) => {
    setSchema(_schema);
    storageManager?.setSchemaCode(schema);
    debouncedValidateSQLSchema(_schema);
  };

  const handleOnChangeCode = (_code: string) => {
    setIndexingCode(_code);
    storageManager?.setIndexerCode(indexingCode);
    debouncedValidateCode(_code);
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '85vh',
        }}
      >
        {!indexerDetails.code && !isCreateNewIndexer && (
          <Alert
            className="px-4 py-3 mb-4 font-semibold text-red-700 text-sm text-center border border-red-300 bg-red-50 rounded-lg shadow-md"
            variant="danger"
          >
            Indexer Function could not be found. Are you sure this indexer exists?
          </Alert>
        )}
        {(indexerDetails.code || isCreateNewIndexer) && (
          <>
            <EditorMenuContainer
              isUserIndexer={indexerDetails.accountId === currentUserAccountId}
              handleDeleteIndexer={handleDeleteIndexer}
              isCreateNewIndexer={isCreateNewIndexer}
              error={error}
              //Fork Indexer Modal
              indexingCode={indexingCode}
              setIndexingCode={setIndexingCode}
              currentUserAccountId={currentUserAccountId}
              //Reset Indexer Modal
              setSchema={setSchema}
              setSchemaTypes={setSchemaTypes}
              //Publish Modal
              actionButtonText={'publish'}
              schema={schema}
              setError={setError}
              showModal={showModal}
            />
            <DeveloperToolsContainer
              handleFormating={handleFormating}
              handleCodeGen={handleCodeGen}
              isExecuting={isExecutingIndexerFunction}
              executeIndexerFunction={executeIndexerFunction}
              heights={heights}
              setHeights={setHeights}
              stopExecution={() => indexerRunner.stop()}
              latestHeight={height}
              diffView={diffView}
              setDiffView={setDiffView}
            />
            <div
              className="mt-2"
              style={{
                flex: 'display',
                justifyContent: 'space-around',
                width: '100%',
                height: '100%',
              }}
            >
              {/* {error && (
                <Alert
                  dismissible={true}
                  onClose={() => setError(undefined)}
                  className="px-4 py-3 mb-4 font-semibold text-red-700 text-sm text-center border border-red-300 bg-red-50 rounded-lg shadow-md"
                  variant="danger"
                >
                  {error}
                </Alert>
              )} */}
              <FileSwitcher fileName={fileName} setFileName={setFileName} showAlert={Boolean(error)} error={error} />
              <GlyphContainer style={{ height: '100%', width: '100%' }}>
                {/* @ts-ignore remove after refactoring Resizable Editor to ts*/}
                <ResizableLayoutEditor
                  fileName={fileName}
                  indexingCode={indexingCode}
                  blockView={blockView}
                  diffView={diffView}
                  onChangeCode={handleOnChangeCode}
                  onChangeSchema={handleOnChangeSchema}
                  block_details={block_details}
                  originalSQLCode={originalSQLCode}
                  originalIndexingCode={originalIndexingCode}
                  schema={schema}
                  isCreateNewIndexer={isCreateNewIndexer}
                  onMount={handleEditorWillMount}
                />
              </GlyphContainer>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default React.memo(Editor);
