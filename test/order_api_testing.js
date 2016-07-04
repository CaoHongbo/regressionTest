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
const buyerHeader = require('../data/order/buyer_header');


// 模拟登陆相关的数据
var sellerLoginReq = supertest.agent('http://' + sellerLogin.req_header.Host);
var buyerLoginReq = supertest.agent('http://' + buyerLogin.req_header.Host);
var sellerResBody;      //卖家模拟登陆返回的数据
var buyerResBody;       //买家模拟登陆返回的数据
// 模拟退出相关的数据
var sellerLogoutReq = supertest.agent('http://' + sellerLogout.req_header.Host);
var buyerLogoutReq = supertest.agent('http://' + buyerLogout.req_header.Host);
// 标书ID
var biddocID;

//mocha框架
describe('买家、卖家模拟发单抢单流程', function () {

    //卖家模拟登陆
    before(function (done) {
        sellerLoginReq[sellerLogin.req_method.toLocaleLowerCase()](sellerLogin.api_url)
            .set(sellerLogin.req_header)
            .send(sellerLogin.req_body)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    logger.error('supertest内部错误，error:' + err);
                    return done(err);
                }

                sellerResBody = res.body;
                done();
            });
    });

    //买家模拟登陆
    before(function (done) {
        buyerLoginReq[buyerLogin.req_method.toLocaleLowerCase()](buyerLogin.api_url)
            .set(buyerLogin.req_header)
            .send(buyerLogin.req_body)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    logger.error('supertest内部错误，error:' + err);
                    return done(err);
                }

                buyerResBody = res.body;
                done();
            });
    });

    it('买家、卖家模拟登陆成功', function (done) {
        try {
            should.equal(sellerResBody['code'], 0, '卖家模拟登陆失败!');
            should.equal(buyerResBody['code'], 0, '买家模拟登陆失败!');
        } catch (err) {
            logger.error('模拟登陆失败！');
            logger.error('seller登录返回信息：' + util.inspect(sellerResBody));
            logger.error('buyer登录返回信息：' + util.inspect(buyerResBody));
            return done(err);
        }
        logger.debug('买家、卖家模拟登陆成功！');
        done();
    });

    it('买家发单成功', function (done) {
        var request = supertest("http://" + buyerHeader.Host);
        var publish = require('../data/order/api_buyer_v2_publish');
        buyerHeader['Authorization'] = buyerResBody.result.user_access_token;

        request[publish.req_method.toLocaleLowerCase()](publish.api_url)
            .set(buyerHeader)
            .send(publish.req_body)
            .expect(200)
            .end(function (err, res) {
                should.not.exist(err, 'supertest访问出错，访问接口错误！');
                should.equal(res.body.code, publish.res_body.code, res.body.message);
                assertData(publish.res_body, res.body, publish.api_url, function () {
                    biddocID = res.body.result.biddoc_id;   //biddocID
                    done();
                })
            })
    });

    it('卖家抢单成功', function (done) {

        should.exist(biddocID, '标书ID不存在');

        var request = supertest("http://" + req_header.Host);
        var sellerRush = require('../data/order/api_seller_v1_sellerrush');
        sellerRush.req_body.biddocId = biddocID;
        req_header['Authorization'] = sellerResBody.result.user_access_token;

        request[sellerRush.req_method.toLocaleLowerCase()](sellerRush.api_url)
            .set(req_header)
            .send(sellerRush.req_body)
            .expect(200)
            .end(function (err, res) {
                //校验err是否存在
                should.not.exist(err, 'supertest访问出错，访问接口错误！');
                //校验code是否为0
                should.equal(res.body.code, sellerRush.res_body.code, res.body.message);
                //校验result中的数据类型是否和标准数据一致
                assertData(sellerRush.res_body, res.body, sellerRush.api_url, function () {
                    done();
                });
            });
    });

    it('TODO', function (done) {
        //TODO
        done({errCode:12345});
    });

    it("卖家成功退出系统", function (done) {
        sellerLogout.req_header['Authorization'] = sellerResBody.result.user_access_token;     //token写到头里面

        sellerLogoutReq[sellerLogout.req_method.toLocaleLowerCase()](sellerLogout.api_url)
            .set(sellerLogout.req_header)
            .expect(200)
            .end(function (err, res) {
                try {
                    should.not.exist(err);
                    should(res.body.code).equal(0);
                } catch (error) {
                    if (err)
                        logger.error("卖家退出系统错误：" + util.inspect(err));
                    else
                        logger.error("卖家退出系统错误：" + util.inspect(res.body));

                    return done(error);
                }
                done();
            });
    });

    it("买家成功退出系统", function (done) {
        buyerLogout.req_header['Authorization'] = buyerResBody.result.user_access_token;     //token写到头里面

        buyerLogoutReq[buyerLogout.req_method.toLocaleLowerCase()](buyerLogout.api_url)
            .set(buyerLogout.req_header)
            .expect(200)
            .end(function (err, res) {
                try {
                    should.not.exist(err);
                    should(res.body.code).equal(0);
                } catch (error) {
                    if (err)
                        logger.error("买家退出系统错误：" + util.inspect(err));
                    else
                        logger.error("买家退出系统错误：" + util.inspect(res.body));

                    return done(error);
                }
                done();
            });
    });


});


//数据属性校验
function assertData(memResult, resResult, url, cb) {
    var i = 0;
    ep.after('cb', i, function () {
        cb();
    });
    for (var key in memResult) {
        if (Object.prototype.toString.call(memResult[key]) == '[object Object]') {
            i++;
            assertData(memResult[key], resResult[key], url, function () {
                ep.emit('cb');
            });
        }

        // if(! (memResult[key] && resResult[key]))
        // else
        should.equal(typeof(memResult[key]), typeof(resResult[key]),
            url + ' data error! expect:memResult[' + key + ']=' + memResult[key] + ' to ' +
            ' actual:resResult[' + key + ']=' + resResult[key]);
    }
}


