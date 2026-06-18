import os
import requests
from dotenv import load_dotenv
from cachetools import TTLCache

load_dotenv()

API_KEY = os.getenv("WEATHER_API_KEY")
weather_cache = TTLCache(maxsize=100, ttl=300)  # Cache for 5 minutes



def get_weather(lat, lon):
    cache_key = f"{round(lat,3)}_{round(lon,3)}"
    if cache_key in weather_cache:
        print("✓ Weather cache hit")
        return weather_cache[cache_key]

    url = (
        f"https://api.weatherapi.com/v1/current.json"
        f"?key={API_KEY}&q={lat},{lon}"
    )

    response = requests.get(url)
    data = response.json()

    weather_data = {
        "temperature_c": data["current"]["temp_c"],
        "humidity": data["current"]["humidity"],
        "visibility_km": data["current"]["vis_km"],
        "wind_kph": data["current"]["wind_kph"],
        "condition": data["current"]["condition"]["text"]
    }

    weather_cache[cache_key] = weather_data
    return weather_data
    
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