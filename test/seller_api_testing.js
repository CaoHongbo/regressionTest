
//  *created by Leechee 2016-06-03
//  *该模块实现了mocha框架的测试
//  *mocha npm address：https://www.npmjs.com/package/node-schedule

const util = require('util');
const fs = require('fs');
const logger = require('./../winston-ext').car2gologger(__filename);
const supertest = require('supertest');
const should = require('should');
const ep = require('eventproxy').create();
const loginData = require('../data/loginData.json');
const logoutData = require('../data/logoutData.json');
const req_header = require('../data/common.json');

// 模拟登陆相关的数据
var loginRequest = supertest.agent('http://' + loginData.req_header.Host);     //loginRequest对象
var loginResBody;      //模拟登陆返回的数据
// 模拟退出相关的数据
var logoutRequest = supertest.agent('http://' + logoutData.req_header.Host);    //logoutRequest对象

var path = __dirname + '/../data/api/';
var arrayDatas = [];

//mocha框架
describe('回归测试',function(){

    //收集数据
    before(function(done){
        fs.readdir(path, function (err, files) {
            if (err) {
                logger.error('fs.readdir, error:' + err);
                return done(err);
            }

            if (files.length == 0) {
                logger.error('数据缺失，没有相关数据可以用来测试！');
                return done();
            }

            files.forEach(function (file) {
                var data = require(path + file);
                arrayDatas.push(data);
            });
            done();
        });
    });

    //模拟登陆
    before(function(done){
        loginRequest[loginData.req_method.toLocaleLowerCase()](loginData.api_url)
            .set(loginData.req_header)
            .send(loginData.req_body)
            .expect(200)
            // .timeout(10000)
            .end(function(err,res){
                if (err) {
                    logger.error('supertest内部错误，error:' + err);
                    return done(err);
                }

                loginResBody = res.body;
                return done();
            });
    });

    it('测试数据准备完毕', function(done){
        try{
            should.notEqual(arrayDatas.length, 0, '数据错误');
        }catch(err){
            logger.error('缺失测试数据');
            return done(err);    //done回调，并把错误传给mocha来处理
        }
        done();
    });

    it('模拟登陆成功', function(done){
        try{
            should.exist(loginResBody, '没有获取到token');
            should.equal(loginResBody['code'], 0, '模拟登陆失败!');
        }catch(err){
            logger.error('模拟登陆失败！');
            logger.error('模拟登陆数据：' + util.inspect(loginData.req_body));
            if(typeof(loginResBody) == 'undefined')
                logger.error('supertest出错，没有获取到token');
            else
                logger.error('模拟登陆返回数据：\n' + util.inspect(loginResBody));
            return done(err);
        }
        logger.debug('模拟登陆成功！');
        logger.debug('模拟登陆数据：' + util.inspect(loginData.req_body));
        logger.debug('模拟登陆返回数据：\n' + util.inspect(loginResBody));
        done();
    });

    it('API回归测试全部成功',function(done){

        ep.after('done', arrayDatas.length, function(result){
            logger.debug('回归测试结束！');
            done();
        });

        arrayDatas.forEach(function(member){

            var request = supertest.agent('http://' + req_header.Host);
            req_header['Authorization'] = loginResBody.result.user_access_token;    //身份验证token写入即将发送的req_header里面

            //发送请求
            request[member.req_method.toLocaleLowerCase()](member.api_url)
                .set(req_header)
                .query(member.query)
                .send(member.req_body)
                .expect(200)
                .redirects(0)   //禁止重定向
                // .timeout(10000)
                .end(function(err,res){
                    if(err){
                        logger.error(member.api_url + ' request,error:' + util.inspect(err));
                        should.not.exist(err, member.api_url + ' request,error:');
                        // ep.emit('done', err);
                    }else{
                        if(res.body['code'] == member.res_body['code']) {
                            // data assertion
                            assertData(member.res_body['result'], res.body['result'], member.api_url, function(){
                                logger.debug('*  ' + member.api_url + ' : perform success!');
                                ep.emit('done', res.body);
                            });
                        }else{
                            logger.error('!  ' + member.api_url + ' : failed!\nreason : ' + util.inspect(res.body));
                            
                            res.body['code'].should.be.equal(member.res_body['code']);
                            res.body['message'].should.be.equal(member.res_body['message']);

                            ep.emit('done', res.body);
                        }
                    }
                });
        });

    });

    it("上传图片接口测试全部成功", function(done){
        done();
    });


    it("成功退出系统", function(done){
        logoutData.req_header['Authorization'] = loginResBody.result.user_access_token;     //token写到头里面

        logoutRequest[logoutData.req_method.toLocaleLowerCase()](logoutData.api_url)
            .set(logoutData.req_header)
            .expect(200)
            .end(function(err, res){
                try{
                    should.not.exist(err);
                    should(res.body.code).equal(0);
                }catch(error){
                    if(err)
                        logger.error("退出系统错误：" + util.inspect(err));
                    else
                        logger.error("退出系统错误：" + util.inspect(res.body));

                    return done(error);
                }
                done();
            });
    });

});

//数据属性校验
function assertData(memResult, resResult, url, cb){
    var i = 0;
    ep.after('cb', i, function(){
        cb();
    });
    for(var key in memResult){
        if(Object.prototype.toString.call(memResult[key]) == '[object Object]'){
            i++;
            assertData(memResult[key], resResult[key], url, function(){
                ep.emit('cb');
            });
        }

        // if(! (memResult[key] && resResult[key]))
        // else
        should.equal(typeof(memResult[key]),typeof(resResult[key]),
            url+' data error! expect:memResult['+key+']='+memResult[key]+' to '+
            ' actual:resResult['+key+']='+resResult[key]);
    }
}

