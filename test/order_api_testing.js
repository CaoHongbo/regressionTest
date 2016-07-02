
//  *created by Leechee 2016-07-01
//  *该模块实现了mocha框架的测试
//  *mocha npm address：https://www.npmjs.com/package/node-schedule

// npm
const util = require('util');
const fs = require('fs');
const logger = require('./../winston-ext').car2gologger(__filename);
const supertest = require('supertest');
const should = require('should');
const ep = require('eventproxy').create();
// module
const sellerLogin = require('../data/sellerLogin');
const sellerLogout = require('../data/sellerLogout');
const buyerLogin = require('../data/buyerLogin');
const buyerLogout = require('../data/buyerLogout');
const req_header = require('../data/common');


// 模拟登陆相关的数据
var sellerLoginReq = supertest.agent('http://' + sellerLogin.req_header.Host);     
var buyerLoginReq = supertest.agent('http://' + buyerLogin.req_header.Host);  
var sellerResBody;      //卖家模拟登陆返回的数据
var buyerResBody;       //买家模拟登陆返回的数据
// 模拟退出相关的数据
var sellerLogoutReq = supertest.agent('http://' + sellerLogout.req_header.Host);    
var buyerLogoutReq = supertest.agent('http://' + buyerLoginReq.req_header.Host);

//mocha框架
describe('买家、卖家模拟发单抢单流程', function(){

    //卖家模拟登陆
    before(function(done){
        sellerLoginReq[sellerLogin.req_method.toLocaleLowerCase()](sellerLogin.api_url)
            .set(sellerLogin.req_header)
            .send(sellerLogin.req_body)
            .expect(200)
            // .timeout(10000)
            .end(function(err,res){
                if (err) {
                    logger.error('supertest内部错误，error:' + err);
                    return done(err);
                }

                sellerResBody = res.body;
                done();
            });
    });

    //买家模拟登陆
    before(function(done){
        buyerLogoutReq[buyerLogin.req_method.toLocaleLowerCase()](buyerLogin.api_url)
            .set(buyerLogin.req_header)
            .send(sellerLogin.req_body)
            .expect(200)
            .end(function(err,res){
                if(err){
                    logger.error('supertest内部错误，error:' + err);
                    return done(err);
                }

                buyerResBody = res.body;
                done();
            });
    });

    it('模拟登陆成功', function(done){
        try{
            should.exist(sellerResBody, '没有获取到token');
            should.equal(sellerResBody['code'], 0, '模拟登陆失败!');
        }catch(err){
            logger.error('模拟登陆失败！');
            logger.error('模拟登陆数据：' + util.inspect(sellerLogin.req_body));
            if(typeof(sellerResBody) == 'undefined')
                logger.error('supertest出错，没有获取到token');
            else
                logger.error('模拟登陆返回数据：\n' + util.inspect(sellerResBody));
            return done(err);
        }
        logger.debug('模拟登陆成功！');
        logger.debug('模拟登陆数据：' + util.inspect(sellerLogin.req_body));
        logger.debug('模拟登陆返回数据：\n' + util.inspect(sellerResBody));
        done();
    });


    it("成功退出系统", function(done){
        sellerLogout.req_header['Authorization'] = sellerResBody.result.user_access_token;     //token写到头里面

        sellerLogoutReq[sellerLogout.req_method.toLocaleLowerCase()](sellerLogout.api_url)
            .set(sellerLogout.req_header)
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

