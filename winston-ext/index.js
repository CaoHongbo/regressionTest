/**
 * Created by Justin on 2015/9/1.
 * Car2Go 系统日志记录器 swishlog v0.2.0
 */

var winston=require("winston");
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
var strftime=require("strftime");
var fs=require("fs");
var path = require('path');
var configObj=new Object(require("./config"));

var logfilePath;
process.setMaxListeners(100);

/* morgan -> winston */
var seq_no = 0;
var prefix = '';

var morgan = require('morgan');
morgan.token('timestamp', function(req, res){
  return strftime('%y-%m-%d %H:%M:%S.%L');
});

exports = module.exports = function (req, res, next) {
  var username;

  var remoteAddress = req.connection.remoteAddress || '';
  var remotePort = req.connection.remotePort;

  ++seq_no;

  prefix = (req.headers['x-forwarded-for'] || '-') + ' ';
  // prefix += req.connection.remoteAddress + ' ';
  // prefix += req.connection.remotePort + ' ';

  if (req.user)
    username = req.user.username;
  else
    username = '-';

  prefix += username + ' ';

  var format;
  format = ':timestamp ';
  format += seq_no + ' ';
  format += 'INFO [ACC] ';
  format += ':req[x-forwarded-for] ' + remoteAddress.substr(7) + ' ' + remotePort + ' ';
  format += username + ' :method :url :status :res[content-length] :response-time ms';

  morgan(format)(req, res, next);
};

exports.car2gologger = exports.logger =
    function (moduleName) {
        moduleName = path.relative(path.join(__dirname, '../..'), moduleName);

        // 检测日志文件夹是否存在
        logfilePath=configObj.logpath;

        if(!fs.existsSync(logfilePath))
        {
            fs.mkdirSync(logfilePath,0777);
        }

        // logfilePath+="/"+configObj.server;
        if(!fs.existsSync(logfilePath))
        {
            fs.mkdirSync(logfilePath,0777);
        }

        function common_formatter(options) {
          var res;

          res = strftime('%y-%m-%d %H:%M:%S.%L') + ' ';
          res += seq_no + ' ';
          res += options.level.toUpperCase() + ' ';
          res += '[' + moduleName + '] '
          res += undefined !== options.message ? options.message : '';
          res += options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '';
          return res;
        }

        // 创建日志记录器
        return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                level:'debug',
                handleExceptions:true,
                formatter: common_formatter
            }),

            new (winston.transports.DailyRotateFile)({
                name:'info-file',
                filename:logfilePath+'/filelog-info.log',
                datePattern:'-yyMMdd',
                maxsize:10*1024*1024,
                json:false,
                level:'debug',
                formatter: common_formatter
            }),

            new (winston.transports.File)({
                name:'error-file',
                filename:logfilePath+'/filelog-error.log',
                handleExceptions:true,
                maxsize:10*1024*1024,
                json:false,
                prettyPrint:true,
                level:'error',
                formatter: common_formatter
            })
        ],
        filters: [
          function (level, msg, meta) {
            return prefix + msg;
          }
        ],
        exitOnError:false
    });
}
