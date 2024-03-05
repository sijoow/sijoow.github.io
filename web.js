const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const app = express();
const PORT = 8007;
app.use(cors());
app.use(express.json());

let db;

MongoClient.connect('mongodb+srv://admin:admin@cluster0.unz3ui3.mongodb.net/forum?retryWrites=true&w=majority', function(err, client) {
    if (err) return console.log(err);
    db = client.db('board');
    console.log('MongoDB에 연결되었습니다.');
});
// 출석체크 요청 처리
app.post('/attend', (req, res) => {
    const { memberId } = req.body;
    const currentDate = new Date().toISOString().slice(0, 10);
    const collection = db.collection('attend');

    // 오늘 날짜와 어제 날짜를 가져오기
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);

    // 어제의 출석체크 데이터 조회
    collection.findOne({ memberId, date: yesterdayDate }, (err, prevAttendance) => {
        if (err) {
            console.error('Error finding previous attendance:', err);
            return res.status(500).json({ error: 'Server error occurred while checking attendance.' });
        }

        // 어제의 출석체크 데이터가 없거나 출석하지 않았을 경우
        if (!prevAttendance || prevAttendance.attendanceCounter === 0) {
            // 오늘의 출석체크 데이터 조회
            collection.findOne({ memberId, date: currentDate }, (err, existingAttendance) => {
                if (err) {
                    console.error('Error finding attendance:', err);
                    return res.status(500).json({ error: 'Server error occurred while checking attendance.' });
                }

                if (existingAttendance) {
                    console.log('User has already attended.');
                    return res.status(400).json({ message: 'User has already attended.', alreadyAttended: true });
                } else {
                    // 오늘의 출석체크 데이터가 없으면 새로운 데이터 추가
                    collection.insertOne({ memberId, date: currentDate, attendanceCounter: 1 }, (err, result) => {
                        if (err) {
                            console.error('Error saving attendance record:', err);
                            return res.status(500).json({ error: 'Failed to save attendance.' });
                        } else {
                            console.log('Attendance record saved.');
                            res.json({ message: 'Attendance completed.', consecutiveAttendance: 1 });
                        }
                    });
                }
            });
        } else {
            // 어제 출석체크를 하지 않았을 경우, 출석체크 실패로 간주하여 attendanceCounter를 1로 초기화
            collection.updateOne({ memberId, date: yesterdayDate }, { $set: { attendanceCounter: 0 } }, (err, result) => {
                if (err) {
                    console.error('Error resetting attendance counter:', err);
                    return res.status(500).json({ error: 'Failed to reset attendance counter.' });
                }
                console.log('Attendance counter reset.');
                
                // 출석체크 실패 메시지와 함께 attendanceCounter를 1로 초기화하여 반환
                res.json({ message: 'Attendance failed. Please try again.', consecutiveAttendance: 1 });
            });
        }
    });
});


app.get('/attendance-status/:memberId', (req, res) => {
    const memberId = req.params.memberId;

    // 해당 memberId의 출석체크 상태를 조회합니다.
    db.collection('attend').findOne({ memberId }, (err, result) => {
        if (err) {
            console.error('Error finding attendance status:', err);
            return res.status(500).json({ error: 'Failed to get attendance status.' });
        }

        // 출석체크 상태를 클라이언트에게 응답합니다.
        if (result) {
            res.json({ consecutiveAttendance: result.attendanceCounter });
        } else {
            res.json({ consecutiveAttendance: 0 });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
