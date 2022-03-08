## 基于TIM + CCL 实现点播/直播弹幕解决方案

### 说明
本demo采用TIM进行弹幕消息管理，CCL(CommentCoreLibrary)进行页面弹幕展示，采用Tcplayer进行点播播放

### 效果展示
<img src="https://miller-1c285a-1253985742.tcloudbaseapp.com/2022git/030802.gif" style="widht: 35%;">

### [Demo线上地址](https://hello-cloudbase-6gaa7fm3ca7687d3-1257245868.tcloudbaseapp.com/video-barrage/index.html)

### 思维导图

<img src="https://miller-1c285a-1253985742.tcloudbaseapp.com/2022git/30703.png" style="widht: 45%;">

### 相关问题点设计思路
 
 1.  关于TIM用户，demo用的是固定的userID，在实际使用中建议还是和业务的userID进行关联，不建议固定userID

 2. （服务端）关于弹幕条数，demo默认一个视频最多拉200条历史弹幕，这个可以根据实际情况调整（实时弹幕不计）
 ```
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
 ```
 3. （服务端）在1的基础上，关于用户和群组的关系，需要判断用户是否在群中，如果不在的话，可以调restapi把该用户添加到群组，这样才能发送弹幕消息(鉴于时间和精力，本demo未做相关判断)
 4. （前端）关于弹幕间隔，目前是根据拉取群历史消息的长度进行均匀分配，设计时长不合理可能会导致一下子把弹幕消息发完了，后面就空落落的，或者一直不出弹幕消息
 ```
         function handleMessageArr(messageArr) {
            barrageList = []
            interTime = Math.floor(videoDuration / messageArr.length)
            messageArr.forEach(handleTextMessaageToBarrage)
            cm.load(barrageList)
        }
        function handleTextMessaageToBarrage(text) {
            const barrage = {
                "mode": 1,
                "text": text,
                "stime": currentTime,
                "size": 25,
                "color": 0xFFFFFF
            }
            currentTime = currentTime + interTime
            barrageList.push(barrage)
        }
 ```
 5. (前端) 关于弹幕的样式可以根据实际情况进行调整,如下面发送实时弹幕的样式是这样的
 ```
        function hanldeLiveMessageToBarage(text) {
            const barrage = {
                "mode": 1,
                "text": text,
                "stime": 0,
                "size": 25,
                "color": 0x7c8f2d
            }
            cm.send(barrage)
        }
 ```
 6. TIM群类型，建议使用加群简单能存储历史消息的类型
 7. 关于直播建议新建群，然后不用拉历史消息，直接实时展示弹幕消息

 ### 跑通Demo
 1. 已经有TIM应用如果没有的话可以去腾讯云控制台创建个体验版应用，详情参考[官网文档](https://cloud.tencent.com/document/product/269)。
 2. 因为有和后端交互，和本demo相关的服务端相关代码在cloudFunctions目录下仅供参考。
 3. 基于1，只要后台能返回需要数据或者前端用mock数据也可以
 ```
  function getDataFromCloudBase() {
            app
                .callFunction({
                    name: "getVideoBarrageInfo",
                    data: { userID, fileID },
                })
                .then((res) => {
                    const { result } = res; //云函数执行结果
                    if (result.status === 'ok') { // 返回了我们想要的结果
                        userSig = result.userSig  // 用户签名
                        groupID = result.groupID  // TIM 群
                        handleTIMInitAndLogin()
                        handleMessageArr(result.messageArr) // ["消息1", "消息2", "消息3"] 这个数据可以用mock数据
                    }
                });
        }
 ```
 4. 在vscode Live Server 上直接Open With Live Server

 ### 参考文档：
CommentCoreLibrary: https://github.com/jabbany/CommentCoreLibrary  

TIM web文档: https://cloud.tencent.com/document/product/269/37411  

Tcplayer 文档: https://cloud.tencent.com/document/product/881/30818  