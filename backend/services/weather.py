import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("WEATHER_API_KEY")


def get_weather(lat, lon):

    url = (
        f"https://api.weatherapi.com/v1/current.json"
        f"?key={API_KEY}&q={lat},{lon}"
    )

    response = requests.get(url)
    data = response.json()

    return {
        "temperature_c": data["current"]["temp_c"],
        "humidity": data["current"]["humidity"],
        "visibility_km": data["current"]["vis_km"],
        "wind_kph": data["current"]["wind_kph"],
        "condition": data["current"]["condition"]["text"]
    }
def weather_to_features(weather):

    condition = weather["condition"].lower()

    return {
        "temperature_c": weather["temperature_c"],

        "weather_visibility_factor":
            weather["visibility_km"],

        "is_rain_event":
            int("rain" in condition),

        "is_fog_event":
            int("fog" in condition),

        "is_storm_event":
            int(
                "storm" in condition
                or "thunder" in condition
            )
    }