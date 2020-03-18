'use strict';

import log from './logger';

class App {
    constructor(oneInch, telegram) {
        this.oneInch = oneInch;
        this.telegram = telegram;
        this.timeout = null;

        process.stdin.resume();

        process.on('exit', this.close.bind(this, {cleanup: true}));
        process.on('SIGINT', this.close.bind(this, {exit: true}));
        process.on('SIGUSR1', this.close.bind(this, {exit: true}));
        process.on('SIGUSR2', this.close.bind(this, {exit: true}));
        process.on('uncaughtException', this.close.bind(this, {exit: true}));
    }

    close(options, exitCode) {
        if (options.cleanup) clearTimeout(this.timeout);
        if (exitCode || exitCode === 0) log.info(`Shutting down: ${exitCode}`);
        if (options.exit) process.exit();
    }

    getQuote(params) {
        const _self = this;

        return new Promise((resolve, reject) => {
            _self.oneInch.getQuote(params, (body, error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(body.toTokenAmount);
            });
        });
    }

    getMultiPathQuote(rule) {
        const _self = this;

        return new Promise(async (resolve, reject) => {
            log.debug(`Checking if ${rule.rule}`);

            const tokens = rule.tokenPath;
            let amount = rule.fromTokenAmount;
            let quoteError;

            for (let i = 0; i < tokens.length - 1; i++) {
                const fromAmount = amount;
                const fromTokenSymbol = tokens[i];
                const toTokenSymbol = tokens[i+1];

                amount = await _self.getQuote({
                    fromTokenSymbol: fromTokenSymbol,
                    toTokenSymbol: toTokenSymbol,
                    amount: fromAmount,
                    disabledExchangeList: rule.disabledExchangeList
                }).catch((error) => {
                    quoteError = `Error getting ${fromTokenSymbol}-${toTokenSymbol} quote: ${error}`;
                });

                if (quoteError) {
                    break;
                }

                log.debug(`${fromAmount} ${fromTokenSymbol} = ${amount} ${toTokenSymbol}`);
            }

            if (quoteError) {
                reject(quoteError);
                return;
            }

            const rate = amount / rule.fromTokenAmount;
            const message = `${rule.fromTokenAmount} ${tokens.join('-')} = ${amount} (${rate})`;

            log.info(message);

            if (eval(`${amount} ${rule.comparitor} ${rule.toTokenAmount}`)) {
                if (!rule.alerted) {
                    _self.telegram.sendNotification({
                        text: message
                    }, (body, error) => {
                        if (error != null) {
                            reject(`Error sending notification: ${error}`);
                            return;
                        }
        
                        rule.alerted = true;
                        resolve();
                    });
                } else {
                    resolve();
                }
            } else {
                rule.alerted = false;
                resolve();
            }
        });
    }

    monitor(rules, interval) {
        const _self = this;

        const checkAll = async (body, error) => {
            if (error) {
                _self.monitor(rules, interval);
                return;
            }

            log.info('Checking rules');

            const quotes = rules.map(async (rule) => {
                return _self.getMultiPathQuote(rule).catch((error) => {
                    log.error(error);
                });
            });

            Promise.all(quotes).catch((error) => {
                log.error(error);
            }).finally(() => {
                clearTimeout(_self.timeout);

                log.info(`Waiting ${interval / 1000} seconds until next check.`);

                _self.timeout = setTimeout(checkAll, interval);
            });
        };

        log.info('Getting tokens');
        this.oneInch.getTokens(checkAll);
    }
}

export default App;