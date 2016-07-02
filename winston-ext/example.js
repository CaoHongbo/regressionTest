/*
 * swishlog example
 */

// var swishlog = require('./winston-ext'); /* compatiblity */
var swishlog = require('swishlog');  /* as module */
var logger = swishlog.logger(__filename);

logger.log('debug', 'some debug');
logger.debug('some debug');
logger.verbose('some verbose');
logger.info('some info');
logger.warn('some warn');
logger.error('some error');
