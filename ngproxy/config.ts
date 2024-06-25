
export type NGProxyConfig = {
    logger?: {
        defaultLogLevel?: string,
        loggerFactoryLevel?: string,
        loggers?: { [key: string]: { displayName?: string, logLevel?: string } }
    },

    authTokenSize?: number
};
