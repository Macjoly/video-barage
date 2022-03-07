const TLSSigAPIv2 = require('./TLSSigAPIv2');
const SDKAPPID = 0;
const api = new TLSSigAPIv2.Api(SDKAPPID, '您的SECRETKEY');
const adminSig = api.genUserSig('administrator', 604800); // 管理员签名默认7天

const axios = require('axios')

let messageList = []


const tcb = require('@cloudbase/node-sdk')
const app = tcb.init({
    env: 'hello-cloudbase-6gaa7fm3ca7687d3'
})
const db = app.database()

// 返回输入参数
let getGroupIDByFileID = async (fileID) => {
    const res = await db
        .collection('video-tim-group')
        .where({
            fileID
        })
        .get()
    const groupID = (res.data && res.data.length) ? res.data[0].groupID : '';
    return groupID;

}


let getMessageList = async (GroupId, ReqMsgSeq) => {
    const reqData = {
        GroupId,
        ReqMsgNumber: 20
    }
    if (ReqMsgSeq) { // 默认拉的是最新消息，续拉的话需要填
        reqData.ReqMsgSeq = ReqMsgSeq
    }

    // 服务端拉取消息 
    const { data } = await axios({
        method: 'post',
        url: `https://console.tim.qq.com/v4/group_open_http_svc/group_msg_get_simple?usersig=${adminSig}&identifier=administrator&sdkappid=${SDKAPPID}&contenttype=json`,
        data: reqData
    })
    if (data.ActionStatus === 'OK' && data.RspMsgList.length) { // 获取到消息进行深拷贝保存
        const len = data.RspMsgList.length;
        const msgSeqFirst = data.RspMsgList[0].MsgSeq
        const msgSeqLast = data.RspMsgList[len - 1].MsgSeq
        const isFinished = data.IsFinished
        messageList = messageList.concat(data.RspMsgList)
        if (isFinished === 1 && messageList.length < 200 && msgSeqFirst > 20) { // 当弹幕消息小于200尝试续拉（条件是当前的消息IsFinished 是正常拉完了）
            await getMessageList(GroupId, msgSeqLast)
        }
    }
    return messageList
}

exports.main = async (event) => {
    const responseVO = {  // 简单定义个返回模型
        status: 'ok',
        msg: '返回成功',
        groupID: '',
        messageArr: []
    }
    messageList = []
    if (event.userID && event.fileID) {
        const userSig = api.genUserSig(event.userID, 604800); // 用户签名过期时间 7天
        const groupID = await getGroupIDByFileID(event.fileID); // 返回groupID
        if (groupID) {
            let messageArr = await getMessageList(groupID)
            messageArr = messageArr.filter(item => !item.IsPlaceMsg)
            messageArr = messageArr.map(item => {
                const msgBody = item.MsgBody
                if (msgBody && msgBody.length && msgBody[0].MsgType === "TIMTextElem" && msgBody[0].MsgContent.Text) {
                    return msgBody[0].MsgContent.Text
                }
            })
            responseVO.status = "ok"
            responseVO.msg = "操作成功"
            responseVO.groupID = groupID
            responseVO.userSig = userSig
            responseVO.messageArr = messageArr
        } else {
            responseVO.status = 'err'
            responseVO.msg = '该点播群不存在'
        }
    } else {
        responseVO.status = 'err'
        responseVO.msg = '参数不合法'
    }


    return responseVO
}
