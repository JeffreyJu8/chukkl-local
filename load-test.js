import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
    stages: [
        { duration: '1m', target: 10000 },
        { duration: '2m', target: 10000 }, 
        { duration: '1m', target: 0 },  
    ],
};

const BASE_URL = 'http://localhost:3003';

export default function () {
    group('Test /about endpoint', function () {
        let res = http.get(`${BASE_URL}/about`);
        check(res, {
            'is status 200': (r) => r.status === 200,
        }) || errorRate.add(1);
        sleep(1);
    });

    group('Test /kids endpoint', function () {
        let res = http.get(`${BASE_URL}/kids`);
        check(res, {
            'is status 200': (r) => r.status === 200,
        }) || errorRate.add(1);
        sleep(1);
    });

    group('Test /kids/about endpoint', function () {
        let res = http.get(`${BASE_URL}/kids/about`);
        check(res, {
            'is status 200': (r) => r.status === 200,
        }) || errorRate.add(1);
        sleep(1);
    });

    group('Test /channels endpoint', function () {
        let res = http.get(`${BASE_URL}/channels`);
        check(res, {
            'is status 200': (r) => r.status === 200,
        }) || errorRate.add(1);
        sleep(1);
    });

    for (let id = 1; id <= 25; id++) {
        group(`Test /channel/${id} endpoint`, function () {
            let res = http.get(`${BASE_URL}/channel/${id}`);
            check(res, {
                'is status 200': (r) => r.status === 200,
            }) || errorRate.add(1);
            sleep(1);
        });

        group(`Test /schedules endpoint for channel ${id}`, function () {
            let res = http.get(`${BASE_URL}/schedules?channelId=${id}&dayOfWeek=Monday`);
            check(res, {
                'is status 200': (r) => r.status === 200,
            }) || errorRate.add(1);
            sleep(1);
        });

        group(`Test /videos endpoint for channel ${id}`, function () {
            let res = http.post(`${BASE_URL}/videos`, JSON.stringify({
                channelId: id,
                timezone: 'America/New_York'
            }), { headers: { 'Content-Type': 'application/json' } });
            check(res, {
                'is status 200': (r) => r.status === 200,
            }) || errorRate.add(1);
            sleep(1);
        });
    }
}
