'use strict';

import log from './logger';

class RulesParser {
    constructor(rules) {
        this.regex = /^([0-9]*\.?[0-9]+)\s([A-Z\-]+)\s(>?<?=?)\s([0-9]*\.?[0-9]+)(?:\s!)?(.*)$/;
    }

    parse(rules) {
        return rules.split("\n").map(rule => {
            const m = this.regex.exec(rule);
        
            if (m.length < 5 || m.length > 6) {
                log.error(`Rule not recognized: ${rule}`);
                return null;
            }
        
            return {
                rule: rule,
                alerted: false,
                fromTokenAmount: m[1],
                tokenPath: m[2].split('-'),
                comparitor: m[3],
                toTokenAmount: m[4],
                disableExchangeList: m[5]
            };
        }).filter(r => !!r);
    }
}

export default RulesParser;