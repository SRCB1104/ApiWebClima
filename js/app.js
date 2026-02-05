async function obtenerClima() {
  const ciudad = document.getElementById("ciudad").value;
  const resultado = document.getElementById("resultado");

  resultado.textContent = "Buscando ubicación...";

  try {
    //Geocoding obtener latitud y longitud por nombre
    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;

    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      resultado.textContent = "Ciudad no encontrada";
      return;
    }

    const lugar = geoData.results[0];
    const lat = lugar.latitude;
    const lon = lugar.longitude;

    resultado.textContent = "Consultando clima...";

    // usar latitud y longitud obtenidas
    const climaUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&timezone=auto`;

    const climaRes = await fetch(climaUrl);
    const climaData = await climaRes.json();

    const c = climaData.current;

    resultado.innerHTML = `
      <h2>${lugar.name}, ${lugar.country}</h2>
      <ul>
        <li>Temperatura: ${c.temperature_2m} °C</li>
        <li>Sensación térmica: ${c.apparent_temperature} °C</li>
        <li>Humedad: ${c.relative_humidity_2m} %</li>
        <li>Viento: ${c.wind_speed_10m} km/h</li>
        <li>Precipitación: ${c.precipitation}</li>
        <li>Hora: ${c.time}</li>
      </ul>
    `;
  } catch (error) {
    resultado.textContent = "Error al obtener el clima";
  }
}
