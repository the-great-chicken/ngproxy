import { NGProxyConfig } from "./config";

type LogFunction = () => (...data: any[]) => void;

export class LogLevel {
    index: number;
    name : string;

    log: LogFunction;
    
    constructor (index: number, name: string, log: LogFunction) {
        this.index = index;
        this.name  = name;

        this.log = log;
    }
}

export class Logger {
    name:     string;
    maxLevel: LogLevel;

    constructor (name: string, maxLevel: LogLevel) {
        this.name     = name;
        this.maxLevel = maxLevel;
    }

    log (level: LogLevel, ...data: any[]) {
        if (level.index > this.maxLevel.index) return ;

        level.log()(...data);
    }

    error   (...data: any[]) { this.log(ERR_LEVEL, ...data); }
    danger  (...data: any[]) { this.log(DGR_LEVEL, ...data); }
    warning (...data: any[]) { this.log(WRN_LEVEL, ...data); }
    info    (...data: any[]) { this.log(INF_LEVEL, ...data); }
    debug   (...data: any[]) { this.log(DBG_LEVEL, ...data); }
};

export class LoggerFactory {
    logger: Logger;
    config: NGProxyConfig;

    constructor (config: NGProxyConfig) {
        this.config = config;
        this.logger = new Logger(
            "logger.factory.default",
            WRN_LEVEL
        );

        const factoryLogLevel = this.getLogLevel( this.config.logger?.loggerFactoryLevel );

        this.logger = new Logger( 
            "logger.factory",
            factoryLogLevel
        );
    }

    convertToLogLevel (name: string | undefined): LogLevel | undefined {
        switch (name) {
            case "error":   return ERR_LEVEL;
            case "danger":  return DGR_LEVEL;
            case "warning": return WRN_LEVEL;
            case "info":    return INF_LEVEL;
            case "debug":   return DBG_LEVEL;
            case "none":    return NO_LOGS;
        }

        if (name)
            this.logger.log(WRN_LEVEL, `Wrong name for log level : ${name}`);
        return undefined;
    }
    getLogLevel (name: string | undefined): LogLevel {
        return this.convertToLogLevel(name)
            ?? this.convertToLogLevel(this.config.logger?.defaultLogLevel)
            ?? ERR_LEVEL;
    }
    build (name: string): Logger {
        const logger = this.config.logger?.loggers[name];
        
        const level       = this.getLogLevel(logger?.logLevel);
        const displayName = logger?.displayName ?? name;
    
        return new Logger(displayName, level);
    }
};

export const NO_LOGS   = new LogLevel(-1, "",   () => () => {});
export const ERR_LEVEL = new LogLevel(0, "ERR", () => console.error);
export const DGR_LEVEL = new LogLevel(1, "DGR", () => console.error);
export const WRN_LEVEL = new LogLevel(2, "WRN", () => console.warn);
export const INF_LEVEL = new LogLevel(3, "INF", () => console.log);
export const DBG_LEVEL = new LogLevel(4, "DBG", () => console.log);
