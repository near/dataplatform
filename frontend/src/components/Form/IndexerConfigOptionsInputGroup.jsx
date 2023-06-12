import React, { useContext, useState, useEffect } from "react";
import { InputGroup } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import { IndexerDetailsContext } from '../../contexts/IndexerDetailsContext';
import { validateContractId } from "../../utils/validators";
const IndexerConfigOptions = ({ updateConfig }) => {
  const { indexerDetails, showPublishModal } = useContext(IndexerDetailsContext);
  const [blockHeight, setBlockHeight] = useState("0");
  const [contractFilter, setContractFilter] = useState("social.near");
  const [selectedOption, setSelectedOption] = useState("latestBlockHeight");
  const [isContractFilterValid, setIsContractFilterValid] = useState(true);
  const [indexerNameField, setIndexerNameField] = useState(indexerDetails.indexerName || "");

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    // setBlockHeightError(null);
  };

  useEffect(() => {
    if (indexerDetails.config?.startBlockHeight) {
      setSelectedOption("specificBlockHeight")
      setBlockHeight(indexerDetails.config.startBlockHeight)
    }
    if (indexerDetails.config?.filter) {
      setContractFilter(indexerDetails.config.filter)
    }
  }, [indexerDetails])

  function handleSetContractFilter(e) {
    const contractFilter = e.target.value;
    setContractFilter(contractFilter);
    const isContractFilterValid = validateContractId(contractFilter);
    setIsContractFilterValid(isContractFilterValid);
  }

  useEffect(() => {
    updateConfig(indexerNameField, contractFilter, blockHeight, selectedOption)
}, [indexerNameField, contractFilter, selectedOption, blockHeight])

  return (
    <>
   <InputGroup size = "sm" >
          <InputGroup.Text> Indexer Name  </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Indexer Name"
          aria-label="IndexerName"
          value={indexerNameField}
          disabled={showPublishModal}
          onChange={(e) => setIndexerNameField(e.target.value)}
        />
      </InputGroup>
        <InputGroup size="sm" className="pt-3">
          <InputGroup.Checkbox
            value="latestBlockHeight"
            checked={selectedOption === "latestBlockHeight"}
            onChange={handleOptionChange}
            aria-label="Checkbox for following text input"
          />
          <InputGroup.Text>From Latest Block Height</InputGroup.Text>
        </InputGroup>
      <InputGroup size="sm" className="px-1 pt-3">
        <InputGroup.Checkbox
          value="specificBlockHeight"
          checked={selectedOption === "specificBlockHeight"}
          onChange={handleOptionChange}
          aria-label="Checkbox for following text input"
        />
        <InputGroup.Text>Specific Block Height</InputGroup.Text>
        <Form.Control
          value={blockHeight}
          onChange={(e) => setBlockHeight(parseInt(e.target.value))}
          type="number"
        />
      </InputGroup>
      <InputGroup size="sm" hasValidation={true} className="px-1 pt-3">
        <InputGroup.Text> Contract Filter</InputGroup.Text>
        <Form.Control
          value={contractFilter}
          onChange={handleSetContractFilter}
          isValid={isContractFilterValid}
          type="text"
          placeholder="social.near"
          required={true}
        />
        <Form.Control.Feedback type="invalid">
          Please provide a valid contract name.
        </Form.Control.Feedback>
      </InputGroup>
    </>
  );
};

export default IndexerConfigOptions;
