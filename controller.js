const axios = require('axios');
const uuid = require('uuid');

const axiosInstance = axios.create({
    baseURL: 'https://coronavirus-tracker-api.herokuapp.com'
});

const getParsedQuery = (query) => {
    const dialogFlowQueryUrl = 'https://api.dialogflow.com/v1/query?v=20150910';

    return axios({
        method: 'post',
        url: dialogFlowQueryUrl,
        data: {
            lang: 'en',
            query: query,
            sessionId: uuid.v4(),
            timezone: 'America/New_York'
        },
        headers: {
            Authorization: 'Bearer 7f9f9f3fc7d941aeb9c84f7797a0c398'
        }
    })
}


const getTotalCases = async (res) => {
    try {
        let { data } = await axiosInstance.get('/all');
        data = {
            message: `Confirmed, deaths and recovered cases in the world are ${data.latest.confirmed}, ${data.latest.deaths} and ${data.latest.recovered} respectively.`
        };
        res.status(200).send(data);
    } catch (err) {
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const getLatestCases = async (res) => {
    try {
        let { data } = await axiosInstance.get('/v2/latest');
        data = {
            message: `Confirmed, deaths and recovered cases in the world are ${data.latest.confirmed}, ${data.latest.deaths} and ${data.latest.recovered} respectively.`
        };
        res.status(200).send(data);
    } catch (err) {
        console.log(JSON.stringify(err, null, 2));
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const getConfirmedCases = async (res) => {
    try {
        let { data } = await axiosInstance.get('/confirmed');
        data = {
            message: `Confirmed coronavirus cases in the world are ${data.latest} respectively.`
        };
        res.status(200).send(data);
    } catch (err) {
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const getRecoveredCases = async (res) => {
    try {
        let { data } = await axiosInstance.get('/recovered');
        data = {
            message: `Recovered coronavirus cases in the world are ${data.latest} respectively.`
        };
        res.status(200).send(data);
    } catch (err) {
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const getDeathCases = async (res) => {
    try {
        let { data } = await axiosInstance.get('/deaths');
        data = {
            message: `Deaths coronavirus cases in the world are ${data.latest} respectively.`
        };
        res.status(200).send(data);
    } catch (err) {
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const getCasesByCountry = async (country, code, datePeriod, state, county, caseType, res) => {
    try {
        let queryParams = '';

        if (code) {
            queryParams = code ? `country_code=${code}&source=jhu` : `country=${country}&source=jhu`;
        } else if (state) {
            queryParams = `province=${state}&source=nyt`
        }

        datePeriod ? queryParams += `&timelines=true` : queryParams += `&timelines=false`;


        console.log(queryParams);

        let { data } = await axiosInstance.get(`/v2/locations?${queryParams}`);

        let from, to;
        if (datePeriod) {
            const timeline = datePeriod.split('/');

            from = timeline[0] + 'T00:00:00Z';
            to = timeline[1] + 'T00:00:00Z';
            let count = 0;

            data.confirmed = 0;
            data.recovered = 0;
            data.deaths = 0;

            for (const location of data.locations) {
                data.confirmed += Math.abs((location.timelines.confirmed.timeline[to] || 0) - (location.timelines.confirmed.timeline[from] || 0));
                data.deaths += Math.abs((location.timelines.deaths.timeline[to] || 0) - (location.timelines.deaths.timeline[from] || 0));
                data.recovered += Math.abs((location.timelines.recovered.timeline[to] || 0) - (location.timelines.recovered.timeline[from] || 0));
                data.datePeriod = datePeriod;

                delete data.locations[count].timelines;
                count++;
            }

            data.total = data.confirmed + data.deaths + data.recovered;
        }

        if (county) {
            for (const location of data.locations) {
                if (location.county === county) {
                    data.county = location;
                    delete data.locations;
                }
            }
        }

        if (data.latest && !data.confirmed) {
            data.confirmed = data.latest.confirmed;
            data.recovered = data.latest.recovered;
            data.deaths = data.latest.deaths;
        }

        console.log('data', data);


        switch (caseType) {
            case 'confirm':
            case 'confirmed':
                data = {
                    message: `Confirmed cases in ${country || state} are ${data.confirmed}`
                };
                break;
            case 'recovery':
            case 'recover':
            case 'recovered':
                data = {
                    message: `Recovered cases in ${country || state} are ${data.recovered}`
                };
                break;
            case 'death':
            case 'deaths':
                data = {
                    message: `Deaths cases in ${country || state} are ${data.deaths}`
                };
                break;
            default:
                if (!datePeriod) {
                    data = {
                        message: `Confirmed, deaths and recovered cases in ${country || state} are ${data.latest.confirmed}, ${data.latest.deaths} and ${data.latest.recovered} respectively.`
                    }
                } else {
                    data = {
                        message: `Confirmed, deaths and recovered cases in ${country || state} are ${data.confirmed}, ${data.deaths} and ${data.recovered} respectively.`
                    }
                }
        }

        if (!data.message) data = { message: 'Oops! I didn\'t get you. Please try again.' };

        console.log('response', data);

        res.status(200).send(data);
    } catch (error) {
        console.log('error', error);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }
}

const handleQuery = async (req, res) => {
    const { query } = req.query;

    try {
        const { data: { result: { parameters } } } = await getParsedQuery(query);

        const { geoCountryCode, caseType, where, geoState, geoCity, datePeriod, county } = parameters;

        // get cases by country 
        if (geoCountryCode && geoCountryCode.name || geoCity || geoState) {
            const name = geoCountryCode.name;
            const code = geoCountryCode['alpha-2'];
            const location = geoState || geoCity;


            return getCasesByCountry(name, code, datePeriod, location, county, caseType, res);
        }

        // get cases of case types
        if (caseType) {
            const type = caseType;
            switch (type) {
                case 'confirmed':
                    return getConfirmedCases(res);
                case 'death':
                case 'deaths':
                    return getDeathCases(res);
                case 'recovered':
                    return getRecoveredCases(res);
                case 'latest':
                    return getLatestCases(res);
            }
        }

        //get cases in the world
        if (where === 'world') {
            return getTotalCases(res);
        }


        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    } catch (err) {
        console.log('error', err);
        res.status(400).send({ message: 'Oops! I didn\'t get you. Please try again.' });
    }

}

module.exports = handleQuery;