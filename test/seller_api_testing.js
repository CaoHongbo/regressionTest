/*
 *created by Leechee 2016-06-03
 *该模块实现了mocha框架的测试
 *mocha npm address：https://www.npmjs.com/package/mocha
 */

const util = require('util'),
      fs = require('fs'),
      logger = require('swishlog').logger(__filename),
      supertest = require('supertest'),
      should = require('should'),
      eventproxy = require('eventproxy'),
      sellerLogin = require('../data/sellerLogin'),
      sellerLogout = require('../data/sellerLogout'),
      buyerLogin = require('../data/buyerLogin'),
      buyerLogout = require('../data/buyerLogout'),
      sellerHeader = require('../data/seller_header'),
      buyerHeader = require('../data/buyer_header'),
      newOrder = require('../data/order/api_seller_v1_neworder');

// 模拟登陆相关的数据
var sellerLoginReq = supertest.agent('http://' + sellerLogin.req_header.Host);
var buyerLoginReq = supertest.agent('http://' + buyerLogin.req_header.Host);
// 模拟退出相关的数据
var sellerLogoutReq = supertest.agent('http://' + sellerLogout.req_header.Host);
var buyerLogoutReq = supertest.agent('http://' + buyerLogout.req_header.Host);

var path = __dirname + '/../data/api/';
var arrayDatas = [];
var picPath = __dirname + '/../data/pic/';
var picArr = [];

// 标书ID
var biddocID;
var sellerResBody;      // 保存卖家模拟登陆的res
var buyerResBody;       // 保存买家模拟登陆的res

//mocha框架
describe('回归测试', function () {

    //收集数据
    before(function (done) {
        fs.readdir(path, function (err, files) {
            if (err) {
                logger.error('fs.readdir, error:' + util.inspect(err));
                return done(err);
            }

            if (files.length == 0) {
                logger.error('数据缺失，没有相关数据可以用来测试！');
                return done();
            }

            files.forEach(function (file) {
                arrayDatas.push(require(path + file));
            });
            done();
        });
    });

    //图片数据
    before(function (done) {
        fs.readdir(picPath, function (err, files) {
            if (err) {
                logger.error('fs.readdir, error:' + err);
                return done(err);
            }

            if (files.length == 0) {
                logger.error('数据缺失，没有相关数据可以用来测试！');
                return done();
            }

            files.forEach(function (file) {
                picArr.push(require(picPath + file));
            });
            done();
        });
    });


    //卖家模拟登陆
    before(function (done) {
        sellerLoginReq[sellerLogin.req_method.toLocaleLowerCase()](sellerLogin.api_url)
            .set(sellerLogin.req_header)
            .send(sellerLogin.req_body)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    logger.error('卖家登录，supertest内部错误，error:' + err);
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
                    logger.error('买家登录，supertest内部错误，error:' + err);
                    return done(err);
                }

                buyerResBody = res.body;
                done();
            });
    });

    it('测试数据准备完毕', function (done) {
        try {
            should.notEqual(arrayDatas.length, 0, '数据错误');
            should.notEqual(picArr.length, 0, '图片相关数据错误');
        } catch (err) {
            logger.error('缺失测试数据');
            return done(err);    //done回调，并把错误传给mocha来处理
        }
        done();
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

    it('卖家请求API测试成功', function (done) {

        var ep = eventproxy.create();
        ep.after('done', arrayDatas.length, function (result) {
            logger.debug('回归测试结束！');
            done();
        });

        arrayDatas.forEach(function (member) {

            var request = supertest.agent('http://' + sellerHeader.Host);
            sellerHeader['Authorization'] = sellerResBody.result.user_access_token;    //身份验证token写入即将发送的header里面

            //发送请求
            request[member.req_method.toLocaleLowerCase()](member.api_url)
                .set(sellerHeader)
                .query(member.query)
                .send(member.req_body)
                .expect(200)
                .redirects(0)   //禁止重定向
                // .timeout(10000)
                .end(function (err, res) {
                    if (err) {
                        logger.error(member.api_url + ' request,error:' + util.inspect(err));
                        should.not.exist(err, member.api_url + ' request,error:');
                        // ep.emit('done', err);
                    } else {
                        if (res.body['code'] == member.res_body['code']) {
                            // data assertion
                            assertData(member.res_body['result'], res.body['result'], member.api_url, function () {
                                logger.debug('*  ' + member.api_url + ' : perform success!');
                                ep.emit('done', res.body);
                            });
                        } else {
                            logger.error('!  ' + member.api_url + ' : failed!\nreason : ' + util.inspect(res.body));

                            res.body['code'].should.be.equal(member.res_body['code']);
                            res.body['message'].should.be.equal(member.res_body['message']);

                            ep.emit('done', res.body);
                        }
                    }
                });
        });

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

                //校验err是否存在
                should.not.exist(err, 'supertest访问出错，访问接口错误！');

                //校验code是否为0
                should.equal(res.body.code, publish.res_body.code, res.body.message);

                //校验result中的数据类型是否和标准数据一致
                assertData(publish.res_body, res.body, publish.api_url, function () {
                    biddocID = res.body.result.biddoc_id;   //biddocID
                    done();
                })
            });
    });

    it('卖家抢单成功', function (done) {

        should.exist(biddocID, '买家发单失败，标书ID不存在');

        var request = supertest("http://" + sellerHeader.Host);
        var sellerRush = require('../data/order/api_seller_v1_sellerrush');
        sellerRush.req_body.biddocId = biddocID;
        sellerHeader['Authorization'] = sellerResBody.result.user_access_token;

        request[sellerRush.req_method.toLocaleLowerCase()](sellerRush.api_url)
            .set(sellerHeader)
            .send(sellerRush.req_body)
            .expect(200)
            .end(function (err, res) {

                //校验err是否存在
                should.not.exist(err, 'supertest访问出错，访问接口错误！');

                //校验code是否为0
                should.equal(res.body.code, sellerRush.res_body.code, res.body.message);

                //校验result中的数据类型是否和标准数据一致
                assertData(sellerRush.res_body, res.body, sellerRush.api_url, function () {
                    newOrder.req_body.bid_id = res.body.result.commuBiddocInfo.bid_id;
                    newOrder.req_body.biddoc_id = res.body.result.commuBiddocInfo.biddoc_id;
                    newOrder.req_body.chat_code = res.body.result.commuBiddocInfo.chat_code;
                    done();
                });

            });
    });

    it('给买家下单成功', function (done) {

        should.exist(newOrder.req_body.bid_id, '无法给买家下单，bid_id不存在');
        should.exist(newOrder.req_body.biddoc_id, '无法给买家下单，biddoc_id不存在');
        should.exist(newOrder.req_body.chat_code, '无法给买家下单，chat_code不存在');

        var request = supertest("http://" + sellerHeader.Host);
        sellerHeader['Authorization'] = sellerResBody.result.user_access_token;

        request[newOrder.req_method.toLocaleLowerCase()](newOrder.api_url)
            .set(sellerHeader)
            .send(newOrder.req_body)
            .expect(200)
            .end(function (err, res) {

                //校验err是否存在
                should.not.exist(err, 'supertest访问出错，访问接口错误！');

                //校验code是否为0
                should.equal(res.body.code, newOrder.res_body.code, res.body.message);

                //校验result中的数据类型是否和标准数据一致
                assertData(newOrder.res_body, res.body, newOrder.api_url, function () {
                    done();
                });

            });
    });

    it("上传图片接口测试全部成功", function (done) {

        var ep = eventproxy.create();
        ep.after('done', picArr.length, function (result) {
            logger.debug('上传图片接口测试完成！');
            done();
        });

        picArr.forEach(function (member) {

            var request = supertest.agent('http://' + member.req_header.Host);
            member.req_header['Authorization'] = sellerResBody.result.user_access_token;    //身份验证token写入即将发送的header里面

            //发送请求
            request
                .post(member.api_url)
                .set(member.req_header)
                .attach('companyMainPhoto', __dirname + '/../photo/test.jpg')       //attach图片
                .expect(200)
                .redirects(0)
                .end(function (err, res) {
                    should.not.exist(err, 'supertest出错：' + util.inspect(err));
                    should.equal(member.res_body.code, res.body.code, 'err:' + util.inspect(res.body));
                    ep.emit('done', res.body);
                });
        });
    });

    it("卖家成功退出系统", function (done) {
        sellerLogout.req_header['Authorization'] = sellerResBody.result.user_access_token;     //token写到头里面

        sellerLogoutReq
            [sellerLogout.req_method.toLocaleLowerCase()](sellerLogout.api_url)
            .set(sellerLogout.req_header)
            .expect(200)
            .end(function (err, res) {
                should.not.exist(err, "卖家退出系统错误：" + util.inspect(err));
                should.equal(sellerLogout.res_body.code, res.body.code, "卖家退出系统错误：" + util.inspect(res.body));
                done();
        });
    });

    it("买家成功退出系统", function (done) {
        buyerLogout.req_header['Authorization'] = buyerResBody.result.user_access_token;     //token写到头里面

        buyerLogoutReq
            [buyerLogout.req_method.toLocaleLowerCase()](buyerLogout.api_url)
            .set(buyerLogout.req_header)
            .expect(200)
            .end(function (err, res) {
                should.not.exist(err, "买家退出系统错误：" + util.inspect(err));
                should.equal(buyerLogout.res_body.code, res.body.code, "买家退出系统错误：" + util.inspect(res.body));
                done();
            });
    });

});

//数据属性校验
function assertData(memResult, resResult, url, cb) {

    var ep = eventproxy.create();   // ep必须局部声明，不能使用外部的eventproxy对象
    var i = 0;                      // after绑定事件所需
    for (var s in memResult) {
        i++;
    }

    // after event bind
    ep.after('cb', i, function () {
        cb();
    });

    // 数据校验
    for (var key in memResult) {
        if (Object.prototype.toString.call(memResult[key]) == '[object Object]') {
            assertData(memResult[key], resResult[key], url, function () {
                ep.emit('cb');
            });
        } else {
            should.equal(typeof memResult[key], typeof resResult[key],
                url + ' data error! expect:memResult[' + key + ']=' + memResult[key] + ' to' +
                ' actual:resResult[' + key + ']=' + resResult[key]);
            ep.emit('cb');
        }
    }
}

