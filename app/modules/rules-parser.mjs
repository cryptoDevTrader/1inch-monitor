'use strict';

import log from './logger';

class RulesParser {
    constructor(rules) {
        this.regex = /^([0-9]*\.?[0-9]+|SLOW|STANDARD|FAST|INSTANT)\s([a-zA-Z\-]+)\s(>?<?=?)\s([0-9]*\.?[0-9]+)(?:\s!)?(.*)$/;
    }

    parse(rules) {
        return rules.split("\n")
        .sort()
        .map(rule => {
            const m = this.regex.exec(rule);

            if (m.length < 5 || m.length > 6) {
                log.error(`Rule not recognized: ${rule}: If you have recently upgraded, note that rules formatting has changed. Please see README for new format.`);
                return null;
            }

            return {
                rule: rule,
                alerted: false,
                fromTokenAmount: m[1],
                tokenPath: m[2].split('-'),
                comparitor: m[3],
                toTokenAmount: m[4],
                disabledExchangeList: m[5]
            };
        }).filter(r => !!r);
    }
}

export default RulesParser;