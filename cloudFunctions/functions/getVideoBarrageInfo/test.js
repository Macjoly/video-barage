const entry = require('./index')

const res = entry.main({userID: '123', fileID: '7447398157015849771', isTest: true}).then(res => {
    console.log(222, res)
}).catch(err => {
    console.log(222, err)
})