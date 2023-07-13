import React, { useEffect, useState, useMemo, useContext } from "react";
import {
  formatSQL,
  formatIndexingCode,
  wrapCode,
  defaultCode,
  defaultSchema,
} from "../../utils/formatters";
import { queryIndexerFunctionDetails } from "../../utils/queryIndexerFunction";
import { Alert } from "react-bootstrap";
import primitives from "!!raw-loader!../../../primitives.d.ts";
import { request, useInitialPayload } from "near-social-bridge";
import IndexerRunner from "../../utils/indexerRunner";
import { block_details } from "./block_details";
import ResizableLayoutEditor from "./ResizableLayoutEditor";
import { ResetChangesModal } from "../Modals/resetChanges";
import { FileSwitcher } from "./FileSwitcher";
import EditorButtons from "./EditorButtons";
import { PublishModal } from "../Modals/PublishModal";
import { ForkIndexerModal } from "../Modals/ForkIndexerModal";
import { getLatestBlockHeight } from "../../utils/getLatestBlockHeight";
import { IndexerDetailsContext } from '../../contexts/IndexerDetailsContext';

const BLOCKHEIGHT_LIMIT = 3600;

const Editor = ({
  onLoadErrorText,
  actionButtonText,
}) => {
  const {
    indexerDetails,
    setShowResetCodeModel,
    setShowPublishModal,
    debugMode,
    isCreateNewIndexer,
    indexerNameField,
    setAccountId,
  } = useContext(IndexerDetailsContext);

  const DEBUG_LIST_STORAGE_KEY = `QueryAPI:debugList:${indexerDetails.accountId}#${indexerDetails.indexerName}`

  const [error, setError] = useState(undefined);
  const [blockHeightError, setBlockHeightError] = useState(undefined);

  const [fileName, setFileName] = useState("indexingLogic.js");

  const [originalSQLCode, setOriginalSQLCode] = useState(formatSQL(defaultSchema));
  const [originalIndexingCode, setOriginalIndexingCode] = useState(formatIndexingCode(defaultCode));
  const [indexingCode, setIndexingCode] = useState(originalIndexingCode);
  const [schema, setSchema] = useState(originalSQLCode);

  const [heights, setHeights] = useState(localStorage.getItem(DEBUG_LIST_STORAGE_KEY) || []);

  const [debugModeInfoDisabled, setDebugModeInfoDisabled] = useState(false);
  const [diffView, setDiffView] = useState(false);
  const [blockView, setBlockView] = useState(false);

  const [isExecutingIndexerFunction, setIsExecutingIndexerFunction] = useState(false);

  const { height, selectedTab, currentUserAccountId } = useInitialPayload();

  const handleLog = (_, log, callback) => {
    if (log) console.log(log);
    if (callback) {
      callback();
    }
  };

  const indexerRunner = useMemo(() => new IndexerRunner(handleLog), []);
  useEffect(() => {
    if (!indexerDetails.code || !indexerDetails.schema) return
    const { formattedCode, formattedSchema } = reformatAll(indexerDetails.code, indexerDetails.schema)
    setOriginalSQLCode(formattedSchema)
    setOriginalIndexingCode(formattedCode)
    setIndexingCode(formattedCode)
    setSchema(formattedSchema)
  }, [indexerDetails.code, indexerDetails.schema]);

  const requestLatestBlockHeight = async () => {
    const blockHeight = getLatestBlockHeight()
    return blockHeight
  }

  useEffect(() => {
    if (selectedTab === "playground") {
      setFileName("GraphiQL");
    }
  }, [selectedTab]);

  useEffect(() => {
    localStorage.setItem(DEBUG_LIST_STORAGE_KEY, heights);
  }, [heights]);

  // useEffect(() => {
  //   if (selectedOption == "latestBlockHeight") {
  //     setBlockHeightError(null);
  //     return;
  //   }
  //
  //   if (height - blockHeight > BLOCKHEIGHT_LIMIT) {
  //     setBlockHeightError(
  //       `Warning: Please enter a valid start block height. At the moment we only support historical indexing of the last ${BLOCKHEIGHT_LIMIT} blocks or ${BLOCKHEIGHT_LIMIT / 3600
  //       } hrs. Choose a start block height between ${height - BLOCKHEIGHT_LIMIT
  //       } - ${height}.`
  //     );
  //   } else if (blockHeight > height) {
  //     setBlockHeightError(
  //       `Warning: Start Block Hieght can not be in the future. Please choose a value between ${height - BLOCKHEIGHT_LIMIT
  //       } - ${height}.`
  //     );
  //   } else {
  //     setBlockHeightError(null);
  //   }
  // }, [blockHeight, height, selectedOption]);

  const checkSQLSchemaFormatting = () => {
    try {
      let formatted_sql = formatSQL(schema);
      let formatted_schema = formatted_sql;
      return formatted_schema;
    } catch (error) {
      console.log("error", error);
      setError(
        () =>
          "Please check your SQL schema formatting and specify an Indexer Name"
      );
      return undefined;
    }
  };


  const forkIndexer = async(indexerName) => {
      let code = indexingCode;

      setAccountId(currentUserAccountId)

      let prevAccountId = indexerDetails.accountId.replaceAll(".", "_");
      let newAccountId = currentUserAccountId.replaceAll(".", "_");
      let prevIndexerName = indexerDetails.indexerName.replaceAll("-", "_").trim().toLowerCase();
      let newIndexerName = indexerName.replaceAll("-", "_").trim().toLowerCase();
      code = code.replaceAll(prevAccountId, newAccountId);
      code = code.replaceAll(prevIndexerName, newIndexerName);
      setIndexingCode(formatIndexingCode(code))
  }

  const registerFunction = async (indexerName, indexerConfig) => {
    let formatted_schema = checkSQLSchemaFormatting();
    let innerCode = indexingCode.match(/getBlock\s*\([^)]*\)\s*{([\s\S]*)}/)[1];
    indexerName = indexerName.replaceAll(" ", "_");
    if (formatted_schema == undefined) {
      setError(
        () =>
          "Please check your SQL schema formatting"
      );
      return;
    }
    setError(() => undefined);

    request("register-function", {
      indexerName: indexerName,
      code: innerCode,
      schema: formatted_schema,
      blockHeight: indexerConfig.startBlockHeight,
      contractFilter: indexerConfig.filter,
    });
    setShowPublishModal(false);
  };

  const handleDeleteIndexer = () => {
    request("delete-indexer", {
      accountId: indexerDetails.accountId,
      indexerName: indexerDetails.indexerName,
    });
  };

  const handleReload = async () => {
    if (isCreateNewIndexer) {
      setShowResetCodeModel(false);
      setIndexingCode((formatIndexingCode(indexerDetails.code)));
      setSchema(formatSQL(indexerDetails.schema))
      return;
    }

    const data = await queryIndexerFunctionDetails(indexerDetails.accountId, indexerDetails.indexerName);
    if (data == null) {
      setIndexingCode(defaultCode);
      setSchema(defaultSchema);
      setError(() => onLoadErrorText);
    } else {
      try {
        let unformatted_wrapped_indexing_code = wrapCode(data.code)
        let unformatted_schema = data.schema;
        if (unformatted_wrapped_indexing_code !== null) {
          setOriginalIndexingCode(() => unformatted_wrapped_indexing_code);
          setIndexingCode(() => unformatted_wrapped_indexing_code);
        }
        if (unformatted_schema !== null) {
          setOriginalSQLCode(unformatted_schema);
          setSchema(unformatted_schema);
        }
        // if (data.start_block_height) {
        //   setSelectedOption("specificBlockHeight");
        //   setBlockHeight(data.start_block_height);
        // }
        // if (data.filter) {
        //   setContractFilter(data.filter.matching_rule.affected_account_id)
        // }
        await reformat(unformatted_wrapped_indexing_code, unformatted_schema)
      } catch (error) {
        console.log(error);
      }
    }
    setShowResetCodeModel(false);
  }

  const getActionButtonText = () => {
    const isUserIndexer = indexerDetails.accountId === currentUserAccountId;
    if (isCreateNewIndexer) return "Create New Indexer"
    return isUserIndexer ? actionButtonText : "Fork Indexer";
  };


  const handleFormattingError = (fileName) => {
    const errorMessage =
      fileName === "indexingLogic.js"
        ? "Oh snap! We could not format your code. Make sure it is proper Javascript code."
        : "Oh snap! We could not format your SQL schema. Make sure it is proper SQL DDL";

    setError(() => errorMessage);
  };

  const reformatAll = (indexingCode, schema) => {
    const formattedCode = formatIndexingCode(indexingCode);
    setIndexingCode(formattedCode);

    const formattedSchema = formatSQL(schema);
    setSchema(formattedSchema);

    return { formattedCode, formattedSchema }
  }

  const reformat = (indexingCode, schema) => {
    return new Promise((resolve, reject) => {
      try {
        let formattedCode;
        if (fileName === "indexingLogic.js") {
          formattedCode = formatIndexingCode(indexingCode);
          setIndexingCode(formattedCode);
        } else if (fileName === "schema.sql") {
          formattedCode = formatSQL(schema);
          setSchema(formattedCode);
        }
        setError(() => undefined);
        resolve(formattedCode);
      } catch (error) {
        handleFormattingError(fileName);
        reject(error);
      }
    });
  };

  async function handleFormating() {
    await reformat(indexingCode, schema);
  }

  function handleEditorMount(editor) {
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent((_) => {
      if (fileName == "indexingLogic.js") {
        setIndexingCode(modifiedEditor.getValue());
      }
      if (fileName == "schema.sql") {
        setSchema(modifiedEditor.getValue());
      }
    });
  }

  function handleEditorWillMount(monaco) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `${primitives}}`,
      "file:///node_modules/@near-lake/primitives/index.d.ts"
    );
  }


  async function executeIndexerFunction(option = "latest", startingBlockHeight = null) {
    setIsExecutingIndexerFunction(() => true)

    switch (option) {
      case "debugList":
        await indexerRunner.executeIndexerFunctionOnHeights(heights, indexingCode, option)
        break
      case "specific":
        if (startingBlockHeight === null && Number(startingBlockHeight) === 0) {
          console.log("Invalid Starting Block Height: starting block height is null or 0")
          break
        }

        await indexerRunner.start(startingBlockHeight, indexingCode, option)
        break
      case "latest":
        const latestHeight = await requestLatestBlockHeight()
        if (latestHeight) await indexerRunner.start(latestHeight - 10, indexingCode, option)
    }
    setIsExecutingIndexerFunction(() => false)
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "85vh",
      }}
    >
      <EditorButtons
        handleFormating={handleFormating}
        executeIndexerFunction={executeIndexerFunction}
        currentUserAccountId={currentUserAccountId}
        getActionButtonText={getActionButtonText}
        heights={heights}
        setHeights={setHeights}
        isCreateNewIndexer={isCreateNewIndexer}
        isExecuting={isExecutingIndexerFunction}
        stopExecution={() => indexerRunner.stop()}
        latestHeight={height}
        isUserIndexer={indexerDetails.accountId === currentUserAccountId}
        handleDeleteIndexer={handleDeleteIndexer}
      />
      <ResetChangesModal
        handleReload={handleReload}
      />
      <PublishModal
        registerFunction={registerFunction}
        actionButtonText={getActionButtonText()}
        blockHeightError={blockHeightError}
      />
      <ForkIndexerModal
        forkIndexer={forkIndexer}
      />

      <div
        className="px-3 pt-3"
        style={{
          flex: "display",
          justifyContent: "space-around",
          width: "100%",
          height: "100%",
        }}
      >
        {error && (
          <Alert className="px-3 pt-3" variant="danger">
            {error}
          </Alert>
        )}
        {debugMode && !debugModeInfoDisabled && (
          <Alert
            className="px-3 pt-3"
            dismissible="true"
            onClose={() => setDebugModeInfoDisabled(true)}
            variant="info"
          >
            To debug, you will need to open your browser console window in
            order to see the logs.
          </Alert>
        )}
        <FileSwitcher
          fileName={fileName}
          setFileName={setFileName}
          diffView={diffView}
          setDiffView={setDiffView}
        />
        <ResizableLayoutEditor
          fileName={fileName}
          indexingCode={indexingCode}
          blockView={blockView}
          diffView={diffView}
          setIndexingCode={setIndexingCode}
          setSchema={setSchema}
          block_details={block_details}
          originalSQLCode={originalSQLCode}
          originalIndexingCode={originalIndexingCode}
          schema={schema}
          isCreateNewIndexer={isCreateNewIndexer}
          handleEditorWillMount={handleEditorWillMount}
          handleEditorMount={handleEditorMount}
        />
      </div>
    </div>
  );
};

export default Editor;
