/**
 * created by Leechee 2016-06-02
 * 该模块实现了回归测试的自动化功能
 * node-schedule npm address：https://www.npmjs.com/package/node-schedule
 * day of week (0 - 7) (0 or 7 is Sunday)
 * month (1 - 12)
 * day of month (1 - 31)
 * hour (0 - 23)
 * minute (0 - 59)
 * second (0 - 59, OPTIONAL)
 */

const util = require('util');
const logger = require('./winston-ext').car2gologger(__filename);
const schedule = require('node-schedule');

var accuracy = 9;
var date = new Date().toLocaleDateString().replace(/-/g,'');
var command = 'node ./node_modules/mocha/bin/_mocha -t 10000 ./test > ./report/report_' +date+ '.txt';
var rule = new schedule.RecurrenceRule();
// var times = [];
// for(var i=0; i<60; i+=accuracy){
//     times.push(i);
// }
rule.hour = accuracy;    //每天9am自动执行测试

var ns = schedule.scheduleJob(rule,function(){
    // 子进程执行mocha框架
    var exec = require('child_process').exec;
    exec(command, function (error, stdout, stderr) {    //执行mocha
        if (error)
            logger.error('exec error: ' + util.inspect(error));
            // ns.cancel();
        else
            logger.debug(new Date().toLocaleString() + ' 运行API回归测试!');
    });
});

