import axios from "axios";

export async function fetchAQI(latitude: number, longitude: number) {
    try {
        const response = await axios.get(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5`
        );
        return response.data;
    } catch (error) {
        console.log("fetchAQI error:", error);
        return null;
    }
}


export async function fetchTemperature(latitude: number, longitude: number) {
    try {
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&timezone=auto`
        );
        return response.data;
    } catch (error) {
        console.log("fetchTemperature error:", error);
        return null;
    }
}


