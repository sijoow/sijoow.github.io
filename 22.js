const express = require('express');
const path = require('path');
const app = express();
const PORT = 8007;

// MongoDB 연결
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

var db;
MongoClient.connect('mongodb+srv://yogibo:yogibo@cluster0.vvkyawf.mongodb.net/?retryWrites=true&w=majority', function(에러, client){
  if (에러) return console.log(에러);
  db = client.db('todoapp');
});

// CORS 허용
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// JSON 파싱 미들웨어 추가
app.use(express.json());
app.post('/attend', (req, res) => {
    const { memberId } = req.body;
    const currentDate = new Date().toISOString().slice(0, 10); 
    
    // 출석체크 데이터를 저장할 collection 선택
    const collection = db.collection('attend');

    // 해당 memberId와 currentDate로 이미 출석체크가 되었는지 확인
    collection.findOne({ memberId, date: currentDate }, (err, existingAttendance) => {
        if (err) {
            console.error('출석체크 확인 중 오류 발생:', err);
            return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
        
        if (existingAttendance) {
            console.log('이미 출석한 사용자입니다.');
            return res.status(400).json({ message: '이미 출석한 사용자입니다.', alreadyAttended: true });
        } else {
            // 이전 출석체크가 없는 경우
            // 이전 출석체크가 없으면 연속 출석체크 초기화
            collection.deleteMany({ memberId }, (err, result) => {
                if (err) {
                    console.error('연속 출석체크 초기화 중 오류 발생:', err);
                    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
                }
                console.log('연속 출석체크가 초기화되었습니다.');

                // 새로운 출석체크 데이터 삽입
                collection.insertOne({ memberId, date: currentDate }, (err, result) => {
                    if (err) {
                        console.error('출석체크 기록 저장 실패:', err);
                        return res.status(500).json({ error: '출석체크 저장에 실패했습니다.' });
                    } else {
                        console.log('출석체크 기록이 저장되었습니다.');
                        res.json({ message: '출석체크가 완료되었습니다.', consecutiveAttendance: 1 });
                    }
                });
            });
        }
    });
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
