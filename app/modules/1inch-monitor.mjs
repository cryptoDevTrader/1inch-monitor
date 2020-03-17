'use strict';

import log from './logger';
import exitHook from 'exit-hook';

class OneInchMonitor {
    constructor(oneInch, telegram) {
        this.oneInch = oneInch;
        this.telegram = telegram;
        this.timeout = null;

		exitHook(() => {
			log.info('Shutting down');
			clearTimeout(this.timeout);
		});
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
                    disableExchangeList: rule.disableExchangeList
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

            const quotes = rules.map(async (rule) => {
                return _self.getMultiPathQuote(rule).catch((error) => {
                    log.error(error);
                });
            });
    
            Promise.all(quotes).finally(() => {
                _self.timeout = setTimeout(checkAll, interval);
            });
        };

        log.debug('Getting tokens');
        return this.oneInch.getTokens(checkAll);
    }
}

export default OneInchMonitor;