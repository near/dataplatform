import React, { useEffect, useState, useCallback } from 'react';
import MonacoEditor, { DiffEditor } from '@monaco-editor/react';
import prettier from 'prettier';
import parserBabel from 'prettier/parser-babel';
import { providers } from 'near-api-js';
import {
  Button,
  Alert,
  Modal,
  ButtonGroup,
  ButtonToolbar,
  Form,
  InputGroup,
  ToggleButtonGroup,
  ToggleButton,
  Nav,
} from 'react-bootstrap';
import SqlPlugin from 'prettier-plugin-sql'
import Switch from "react-switch";
import primitives from '!!raw-loader!../../../primitives.d.ts';
import IndexerDetailsGroup from "../Form/IndexerDetailsGroup.js"
import BlockHeightOptions from "../Form/BlockHeightOptionsInputGroup.js"
const defaultCode = `import {Block} from "@near-lake/primitives"

/** 
 * Note: We only support javascript at the moment. We will support Rust, Typescript in a further release. 
 */


/**
 * getBlock(block, context) applies your custom logic to a Block on Near and commits the data to a database. 
 * 
 * Learn more about indexers here:  https://docs.near.org/concepts/advanced/indexers
 * 
 * @param {block} Block - A Near Protocol Block 
 * @param {context} - A set of helper methods to retrieve and commit state
 */
async function getBlock(block: Block, context) {
  // Add your code here   
  const h = block.header().height
  await context.set('height', h);
}`

const defaultSchema = `
CREATE TABLE "indexer_storage" ("function_name" TEXT NOT NULL, "key_name" TEXT NOT NULL, "value" TEXT NOT NULL, PRIMARY KEY ("function_name", "key_name"))
`

//network config (replace testnet with mainnet or betanet)
const provider = new providers.JsonRpcProvider(
  "https://archival-rpc.mainnet.near.org"
);
const contractId = "registry.queryapi.near"

// get latest block height
const getLatestBlockHeight = async () => {
  const provider = new providers.JsonRpcProvider(
    "https://archival-rpc.mainnet.near.org"
  );
  const latestBlock = await provider.block({
    finality: "final"
  });
  return latestBlock.header.height;
}

const get_indexer_function_details = async (name) => {
  let args = { function_name: name };

  try {
    const result = await provider.query({
      request_type: "call_function",
      account_id: contractId,
      method_name: "read_indexer_function",
      args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      finality: "optimistic",
    });
    return (
      result.result &&
      result.result.length > 0 &&
      JSON.parse(Buffer.from(result.result).toString())
    );
  }
  catch (error) {
    console.log(error, "error")
    return null;
  }
}

const Editor = ({
  options,
  accountId,
  indexerName,
  onLoadErrorText,
  actionButtonText,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);
  const [showResetCodeModel, setShowResetCodeModel] = useState(false);
  const [fileName, setFileName] = useState("indexingLogic.js");
  const [originalSQLCode, setOriginalSQLCode] = useState(defaultSchema);
  const [originalIndexingCode, setOriginalIndexingCode] = useState(defaultCode);

  const [indexingCode, setIndexingCode] = useState(defaultCode);
  const [schema, setSchema] = useState(defaultSchema);
  const [diffView, setDiffView] = useState(false);
  const [indexerNameField, setIndexerNameField] = useState(indexerName ?? "");
  const [selectedOption, setSelectedOption] = useState('latestBlockHeight');
  const [blockHeight, setBlockHeight] = useState(86928994);
  const [playgroundLink, setPlaygroundLink] = useState()
  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  }
  const format_SQL_code = (schema) => {
    const formattedSQL = prettier.format(schema, {
      parser: "sql",
      formatter: "sql-formatter",
      plugins: [SqlPlugin],
      pluginSearchDirs: false,
      language: 'postgresql',
      database: 'postgresql',
    });
    return formattedSQL;

  };

  const checkSQLSchemaFormatting = () => {
    try {
      let formatted_code = format_SQL_code(schema);
      let formatted_schema = formatted_code;
      return formatted_schema;
    }
    catch (error) {
      console.log("error", error)
      setError(() => "Please check your SQL schema formatting and specify an Indexer Name");
      return undefined;
    }
  }

  const registerFunction = async () => {
    // if (selectedOption === "latestBlockHeight") {
    //   setBlockHeight(await getLatestBlockHeight())
    // }

    let formatted_schema = checkSQLSchemaFormatting();
    const innerCode = indexingCode.match(/getBlock\s*\([^)]*\)\s*{([\s\S]*)}/)[1]
    if (indexerNameField == undefined || formatted_schema == undefined) {
      setError(() => "Please check your SQL schema formatting and specify an Indexer Name");
      return
    }
    setError(() => undefined);
    console.log("formatted_schema", formatted_schema)
    console.log("indexer code", indexingCode)

    // Send a message to other sources
    window.parent.postMessage({ action: "register_function", value: { indexerName: indexerNameField.replace(" ", "_"), code: innerCode, schema: formatted_schema, blockHeight: blockHeight }, from: "react" }, "*");
  };

  useEffect(() => {
    if (options.create_new_indexer === false) {

      setPlaygroundLink(generatePlaygroundLink())
    }
  }, [schema])

  const handleReload = useCallback(async () => {
    if (options?.create_new_indexer === true) {
      // setIndexingCode(defaultCode);
      // setSchema(defaultSchema);
      setShowResetCodeModel(false)
      return
    }

    const data = await get_indexer_function_details(accountId + "/" + indexerNameField)
    if (data == null) {
      setIndexingCode(defaultCode);
      setSchema(defaultSchema);
      setError(() => onLoadErrorText);
    } else {
      try {
        let unformatted_indexing_code = format_querried_code(data.code);
        let unformatted_schema = data.schema;
        if (unformatted_indexing_code !== null) {
          setOriginalIndexingCode(unformatted_indexing_code);
          setIndexingCode(unformatted_indexing_code);
        }
        if (unformatted_schema !== null) {
          setOriginalSQLCode(unformatted_schema);
          setSchema(unformatted_schema);
        }
      }
      catch (error) {
        console.log(error);
        setError(() => "An Error occured while trying to format the code.");
      }
    }

    setShowResetCodeModel(false)
  }, [accountId, indexerNameField, onLoadErrorText, options?.create_new_indexer])

  const format_querried_code = (code) => {
    code = code.replace(/(?:\\[n])+/g, "\r\n")
    let unformatted_code = `import {Block} from "@near-lake/primitives"
 /** 
     * Note: We only support javascript at the moment. We will support Rust, Typescript in a further release. 
     */
    
    
    /**
     * getBlock(block, context) applies your custom logic to a Block on Near and commits the data to a database. 
     * 
     * Learn more about indexers here:  https://docs.near.org/concepts/advanced/indexers
     * 
     * @param {block} Block - A Near Protocol Block 
     * @param {context} - A set of helper methods to retrieve and commit state
     */
    async function getBlock(block: Block, context) {
      ${code}
    }`

    try {
      let formatted_code = prettier.format(unformatted_code, {
        parser: "babel",
        plugins: [parserBabel],
      });
      setError(() => undefined);
      return formatted_code;
    } catch (error) {
      setError(() => "Oh snap! We could not format the queried code. The code in the registry contract may be invalid Javascript code. ");
      console.log(error);
      return unformatted_code
    }
  }


  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await handleReload()
      setLoading(false)
    }
    load()
  }, [accountId, handleReload, indexerName])

  const formatIndexingCode = (code) => {
    return prettier.format(code, {
      parser: "babel",
      plugins: [parserBabel],
    });
  };

  const formatSQLSchema = (schema) => {
    return prettier.format(schema, {
      parser: "sql",
      formatter: "sql-formatter",
      plugins: [SqlPlugin],
      pluginSearchDirs: false,
      language: 'postgresql',
      database: 'postgresql',
    });
  };

  const handleFormattingError = (fileName) => {
    const errorMessage = fileName === "indexingLogic.js"
      ? "Oh snap! We could not format your code. Make sure it is proper Javascript code."
      : "Oh snap! We could not format your SQL schema. Make sure it is proper SQL DDL";

    setError(() => errorMessage);
  };

  const reformat = () => {
    return new Promise((resolve, reject) => {
      try {
        let formattedCode;
        if (fileName === "indexingLogic.js") {
          formattedCode = formatIndexingCode(indexingCode);
          setIndexingCode(formattedCode);
        } else if (fileName === "schema.sql") {
          formattedCode = formatSQLSchema(schema);
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
    await reformat()
  }

  async function submit() {
    // Handle Register button click
    await reformat()
    await registerFunction()
  }

  function handleEditorMount(editor) {
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent((_) => {
      console.log(modifiedEditor.getValue());
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
      'file:///node_modules/@near-lake/primitives/index.d.ts'
    );
  }

  function generateGraphQLQuery(accountName, indexerName) {
    const tableRegex = /CREATE TABLE "([^"]+)"\s*\(([^)]+)\)/g;
    const fieldRegex = /"([^"]+)"\s+([A-Za-z]+)/g;

    let tableMatches;
    const tables = {};

    while ((tableMatches = tableRegex.exec(schema)) !== null) {
      const tableName = tableMatches[1];
      const fieldList = tableMatches[2];

      let fieldMatches;
      const fields = {};

      while ((fieldMatches = fieldRegex.exec(fieldList)) !== null) {
        const fieldName = fieldMatches[1];
        const fieldType = fieldMatches[2];
        fields[fieldName] = fieldType;
      }

      tables[tableName] = fields;
    }

    const queryParts = [];
    const accountNamePrefix = accountName.replaceAll('.', '_');
    const indexerNamePrefix = indexerName.replaceAll('-', '_');

    for (const tableName in tables) {
      const prefixedTableName = `${accountNamePrefix}_${indexerNamePrefix}_${tableName}`;
      const fieldNames = Object.keys(tables[tableName]).join(', ');
      queryParts.push(`${prefixedTableName} { ${fieldNames} }`);
    }

    return `query { ${queryParts.join(', ')} }`;
  }

  function generatePlaygroundLink() {
    let endpoint = `https://cloud.hasura.io/public/graphiql?endpoint=https%3A%2F%2Fquery-api-hasura-vcqilefdcq-uc.a.run.app%2Fv1%2Fgraphql`
    endpoint += `&header=x-hasura-role%3A${accountId.replaceAll('.', '_')}`
    return endpoint + "&query=" + encodeURIComponent(generateGraphQLQuery(accountId, indexerName))
    // window.parent.postMessage({ action: "view_playground", value: { indexerName: indexerNameField.replace(" ", "_"), link: endpoint + "&query=" + encodeURIComponent(generateGraphQLQuery(accountId, indexerName)) }, from: "react" }, "*");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {
        <>
          <ButtonToolbar className="pt-3 pb-1 flex-col" aria-label="Actions for Editor">
            <IndexerDetailsGroup accountId={accountId} indexerNameField={indexerNameField} setIndexerNameField={setIndexerNameField} isCreateNewIndexerPage={options.create_new_indexer} />
            {options?.create_new_indexer && <>
              <BlockHeightOptions selectedOption={selectedOption} handleOptionChange={handleOptionChange} blockHeight={blockHeight} setBlockHeight={setBlockHeight} />
            </>}
            <ButtonGroup className="px-3 pt-3" style={{ width: '100%' }} aria-label="Action Button Group">
              <Button variant="secondary" className="px-3" onClick={() => setShowResetCodeModel(true)}> Reset</Button>{' '}
              <Button variant="secondary" className="px-3" onClick={() => handleFormating()}> Format Code</Button>{' '}
              <Button variant="primary" className="px-3" onClick={() => submit()}>
                {actionButtonText}
              </Button>

            </ButtonGroup>
            {
              options?.create_new_indexer === false &&
              <InputGroup style={{ width: "100%", padding: "10px" }}>
                <InputGroup.Text id="btnGroupAddon">GraphQL Playground:</InputGroup.Text>
                <Form.Control
                  type="text"
                  value={playgroundLink}
                  disabled={true}
                  aria-label="Graph QL Playground Link"
                  aria-describedby="btnGroupAddon"
                />
              </InputGroup>
            }
          </ButtonToolbar></>}
      <Modal show={showResetCodeModel} onHide={() => setShowResetCodeModel(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Are you sure?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          The changes you have made in the editor will be deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetCodeModel(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleReload()}>
            Reload
          </Button>
        </Modal.Footer>
      </Modal>

      {error && <Alert className="px-3 pt-3" variant="danger">
        {error}
      </Alert>}

      <div className="px-3" style={{ "flex": "display", justifyContent: "space-around", "width": "100%" }}>
        <ToggleButtonGroup type="radio" style={{ backgroundColor: 'white' }} name="options" defaultValue={"indexingLogic.js"}
        >
          <ToggleButton id="tbg-radio-1" style={{ backgroundColor: fileName === "indexingLogic.js" ? 'blue' : "grey", "borderRadius": "0px" }} value={"indexingLogic.js"} onClick={() => setFileName("indexingLogic.js")}>
            indexingLogic.js
          </ToggleButton>
          <ToggleButton id="tbg-radio-2" style={{ backgroundColor: fileName === "indexingLogic.js" ? 'grey' : "blue", "borderRadius": "0px" }} value={"schema.sql"} onClick={() => setFileName("schema.sql")}>
            schema.sql
          </ToggleButton>
          <InputGroup  >
            <InputGroup.Text className='px-3'> Diff View
              <Switch
                className='px-1'
                checked={diffView}
                onChange={(checked) => {
                  setDiffView(checked)
                }}
              /></InputGroup.Text>
          </InputGroup>
        </ToggleButtonGroup>
        {fileName === "indexingLogic.js" && (
          diffView ? (
            <DiffEditor
              original={originalIndexingCode}
              modified={indexingCode}
              height="50vh"
              width="100%"
              language="javascript"
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{ ...options, readOnly: false }}
            />
          ) : (
            <MonacoEditor
              value={indexingCode}
              height="50vh"
              width="100%"
              defaultValue={defaultCode}
              defaultLanguage="typescript"
              theme="vs-dark"
              onChange={(text) => setIndexingCode(text)}
              beforeMount={handleEditorWillMount}
              options={{ ...options, readOnly: false }}
            />
          )
        )}
        {fileName === "schema.sql" &&
          (diffView ? (
            <DiffEditor
              original={originalSQLCode}
              modified={schema}
              height="50vh"
              width="100%"
              language="sql"
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                ...options,
                readOnly: options?.create_new_indexer === true ? false : true,
              }}
            />
          ) : (
            <MonacoEditor
              value={schema}
              height="50vh"
              width="100%"
              defaultValue={defaultSchema}
              defaultLanguage="sql"
              theme="vs-dark"
              onChange={(text) => setSchema(text)}
              options={{
                ...options,
                readOnly: options?.create_new_indexer === true ? false : false,
              }}
            />
          ))}
      </div>
    </div>);
}
export default Editor;
