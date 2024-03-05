const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const app = express();
const PORT = 8007;
app.use(cors());
app.use(express.json());

let db;

MongoClient.connect('mongodb+srv://yogibo:yogibo@cluster0.vvkyawf.mongodb.net/?retryWrites=true&w=majority', function(err, client) {
    if (err) return console.log(err);
    db = client.db('todoapp');
    console.log('MongoDB에 연결되었습니다.');
});

app.post('/attend', (req, res) => {
    const { memberId } = req.body;
    const currentDate = new Date().toISOString().slice(0, 10);
    const collection = db.collection('attend');

    // MongoDB에서 attendanceCounter 값을 가져오는 함수
    function getAttendanceCounter(memberId, callback) {
        collection.findOne({ memberId }, (err, result) => {
            if (err) {
                console.error('Error finding attendanceCounter:', err);
                callback(err, null);
            } else {
                // 결과가 있으면 attendanceCounter 값을 콜백으로 전달합니다.
                callback(null, result ? result.attendanceCounter : 0);
            }
        });
    }

    // 해당 memberId와 currentDate로 이미 출석체크가 되었는지 확인
    collection.findOne({ memberId, date: currentDate }, (err, existingAttendance) => {
        if (err) {
            console.error('Error finding attendance:', err);
            return res.status(500).json({ error: 'Server error occurred while checking attendance.' });
        }

        if (existingAttendance) {
            console.log('User has already attended.');
            return res.status(400).json({ message: 'User has already attended.', alreadyAttended: true });
        } else {
            // 출석체크 횟수를 가져온 뒤 증가시킴
            getAttendanceCounter(memberId, (err, attendanceCounter) => {
                if (err) {
                    // 오류 발생 시
                    return res.status(500).json({ error: 'Failed to get attendanceCounter.' });
                }

                const newAttendanceCount = attendanceCounter + 1;

                collection.insertOne({ memberId, date: currentDate, attendanceCounter: newAttendanceCount }, (err, result) => {
                    if (err) {
                        console.error('Error saving attendance record:', err);
                        return res.status(500).json({ error: 'Failed to save attendance.' });
                    } else {
                        console.log('Attendance record saved.');

                        // 출석일에 따라 이미지 URL 설정
                        let imageUrl = `https://yogibo.kr/web/img/event/attend/0227/day${newAttendanceCount}.jpg`;

                        res.json({ message: 'Attendance completed.', consecutiveAttendance: newAttendanceCount, imageUrl });
                    }
                });
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
