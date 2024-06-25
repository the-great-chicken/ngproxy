import { NGProxyConfig } from "./config";
import { LoggerFactory } from "./logger";

export class NGProxyContext {
    public config: NGProxyConfig;

    public loggerFactory: LoggerFactory;

    constructor (config: NGProxyConfig) {
        this.config = config;
        
        this.loggerFactory = new LoggerFactory(config);
    }
}
