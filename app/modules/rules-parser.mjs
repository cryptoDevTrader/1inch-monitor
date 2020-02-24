'use strict';

import log from './logger';

class RulesParser {
    constructor(rules) {
        this.regex = /^([0-9]*\.?[0-9]+)\s([A-Z]+)\s(>?<?=?)\s([0-9]*\.?[0-9]+)\s([A-Z]+)(?:\s!)?(.*)$/;
    }

    parse(rules) {
        return rules.split("\n").map(rule => {
            const m = this.regex.exec(rule);
        
            if (m.length < 6 || m.length > 7) {
                log.error(`Rule not recognized: ${rule}`);
                return null;
            }
        
            return {
                rule: rule,
                alerted: false,
                fromTokenAmount: m[1],
                fromTokenSymbol: m[2],
                comparitor: m[3],
                toTokenAmount: m[4],
                toTokenSymbol: m[5],
                disableExchangeList: m[6]
            };
        }).filter(r => !!r);
    }
}

export default RulesParser;