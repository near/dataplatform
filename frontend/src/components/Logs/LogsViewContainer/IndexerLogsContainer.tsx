import React, { useContext, useState, useEffect, useRef } from "react";
import { useInitialPayload } from "near-social-bridge";
import { sanitizeString } from "../../../utils/helpers";
import { IndexerDetailsContext } from "../../../contexts/IndexerDetailsContext";
import IndexerLogsView from "../LogsView/IndexerLogsView";
import { Grid } from "gridjs";

import { getIndexerLogsQueryDefinition } from "../GraphQL/getIndexerLogsQueryDefinition";
import { getSearchLogsQueryDefinition } from "../GraphQL/getSearchLogsQueryDefinition";
import { formatTimestamp } from "@/utils/formatTimestamp";
interface GridConfig {
    columns: string[];
    search: any;
    pagination: any;
    server: any;
    style: any;
    sort: boolean;
}

interface InitialPayload {
    currentUserAccountId: string;
}

const DEV_ENV: string = 'https://queryapi-hasura-graphql-mainnet-vcqilefdcq-ew.a.run.app/v1/graphql';
const PROD_ENV: string = 'https://queryapi-hasura-graphql-24ktefolwq-ew.a.run.app/v1/graphql';
const LOGS_PER_PAGE: number = 75;

const IndexerLogsContainer: React.FC = () => {
    const { indexerDetails, latestHeight } = useContext(IndexerDetailsContext);
    const { currentUserAccountId } = useInitialPayload<InitialPayload>();

    const sanitizedAccountId: string = sanitizeString(indexerDetails.accountId);
    const sanitizedIndexerName: string = sanitizeString(indexerDetails.indexerName);

    const functionName: string = `${indexerDetails.accountId}/${indexerDetails.indexerName}`;
    const schemaName: string = `${sanitizedAccountId}_${sanitizedIndexerName}`;
    const tableName: string = `${schemaName}_sys_logs`;

    const [severity, setSeverity] = useState<string>('');
    const [logType, setLogType] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    // const [endTime, setEndTime] = useState<string>(''); //todo: for custom time range

    const gridContainerRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<Grid | null>(null);

    const getIndexerLogsConfig: any = () => {
        return {
            url: DEV_ENV,
            method: 'POST',
            headers: {
                ['x-hasura-role']: sanitizedAccountId,
                ['Content-Type']: 'application/json',
            },
            body: JSON.stringify({
                query: getIndexerLogsQueryDefinition(tableName, severity, logType, startTime),
                variables: { limit: LOGS_PER_PAGE, offset: 0 },
            }),
            then: ({ data }: any) => (
                data[tableName].map((log: any) => [
                    log.level,
                    log.type,
                    formatTimestamp(log.timestamp) ?? log.timestamp,
                    log.block_height,
                    log.message
                ])
            ),
            total: ({ data }: any) => (data[`${tableName}_aggregate`].aggregate.count),
        };
    };

    const getSearchConfig: any = () => {
        return {
            debounceTimeout: 500,
            server: {
                url: (prev: string, keyword: string) => prev,
                body: (prev: string, keyword: string) => {
                    return JSON.stringify({
                        query: getSearchLogsQueryDefinition(tableName, keyword, severity, logType, startTime),
                        variables: { limit: LOGS_PER_PAGE, offset: 0 },
                    });
                },
                then: ({ data }: any) => (data[tableName]),
                total: ({ data }: any) => (data[`${tableName}_aggregate`].aggregate.count),
            },
        };
    };

    const getPaginationConfig: any = () => {
        return {
            prevButton: false,
            nextButton: false,
            limit: LOGS_PER_PAGE,
            buttonsCount: 0
        };
    };

    const getGridStyle: any = () => {
        return {
            container: {
                fontFamily: "Roboto Mono, monospace",
            },
            table: {
                borderCollapse: "collapse",
                width: "100%",
            },
            th: {
                backgroundColor: "#f8f8f8",
                fontSize: "14px",
                textAlign: "left",
                fontWeight: "bold",
            },
            td: {
                padding: "2px 10px",
                textAlign: "left",
                fontSize: "14px",
            },
        };
    };

    const getLanguageConfig: any = () => {
        return {
            search: {
                'placeholder': '🔍 Search by Message or Block Height',
            },
        };
    }

    const renderGrid = () => {
        const gridConfig: GridConfig = getGridConfig();
        const grid: Grid = new Grid(gridConfig);
        grid.render(gridContainerRef.current as Element);
        gridRef.current = grid;
    };

    const getGridConfig: any = () => {
        return {
            columns: [
                { name: 'LEVEL', width: '100px' },
                { name: 'TYPE', width: '100px' },
                { name: 'TIMESTAMP', width: '225px' },
                { name: 'HEIGHT', width: '100px' },
                { name: 'MESSAGE', width: 'auto' },
            ],
            search: getSearchConfig(),
            pagination: getPaginationConfig(),
            server: getIndexerLogsConfig(),
            style: getGridStyle(),
            language: getLanguageConfig(),
            // sort: true,
        };
    };

    const reloadData = () => {
        if (gridRef.current) gridRef.current.destroy();
        renderGrid();
    };

    useEffect(() => {
        renderGrid();
    }, []);

    useEffect(() => {
        reloadData();
    }, [severity, logType, startTime]);

    return (
        <IndexerLogsView
            severity={severity}
            setSeverity={setSeverity}
            logType={logType}
            setLogType={setLogType}
            startTime={startTime}
            setStartTime={setStartTime}
            functionName={functionName}
            tableName={tableName}
            latestHeight={latestHeight}
            currentIndexerDetails={indexerDetails}
            currentUserAccountId={currentUserAccountId}
            getIndexerLogsQueryDefinition={getIndexerLogsQueryDefinition}
            getIndexerLogsConfig={getIndexerLogsConfig}
            getSearchConfig={getSearchConfig}
            getPaginationConfig={getPaginationConfig}
            getGridStyle={getGridStyle}
            getGridConfig={getGridConfig}
            reloadData={reloadData}
            gridContainerRef={gridContainerRef}
        />
    );
};

export default IndexerLogsContainer;