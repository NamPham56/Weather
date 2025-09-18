import axios from "axios";

export async function fetchweather(latitude: number, longitude: number) {
    try {
        console.log(latitude, longitude)
        const respone = await axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5`)
        return respone.data
    } catch (error) {
        console.log(error)
    }
}