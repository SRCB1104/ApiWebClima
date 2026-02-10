function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// RETRY (REINTENTO)
async function fetchConReintento(url, opciones = {}, intentos = 3, esperaMs = 500) {
  let ultimoError;

  for (let i = 1; i <= intentos; i++) {
    try {
      const respuesta = await fetch(url, opciones);

      if (!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status);
      }

      return respuesta;
    } catch (error) {
      ultimoError = error;

      if (i < intentos) {
        await esperar(esperaMs * i);
      }
    }
  }

  throw ultimoError;
}

// CIRCUIT BREAKER
class InterruptorCircuito {
  constructor({ umbralFallos = 3, tiempoBloqueo = 15000 } = {}) {
    this.umbralFallos = umbralFallos;
    this.tiempoBloqueo = tiempoBloqueo;

    this.fallos = 0;
    this.abiertoHasta = 0;
  }

  estaAbierto() {
    return Date.now() < this.abiertoHasta;
  }

  registrarExito() {
    this.fallos = 0;
    this.abiertoHasta = 0;
  }

  registrarFallo() {
    this.fallos++;

    if (this.fallos >= this.umbralFallos) {
      this.abiertoHasta = Date.now() + this.tiempoBloqueo;
    }
  }

  async ejecutar(funcionAsync) {
    if (this.estaAbierto()) {
      throw new Error("CIRCUITO_ABIERTO");
    }

    try {
      const resultado = await funcionAsync();
      this.registrarExito();
      return resultado;
    } catch (error) {
      this.registrarFallo();
      throw error;
    }
  }
}

// Crear un interruptor para el clima
const interruptorClima = new InterruptorCircuito({
  umbralFallos: 3,
  tiempoBloqueo: 15000
});

// FUNCION PARA OBTENER JSON
async function obtenerJsonSeguro(url) {
  return interruptorClima.ejecutar(async () => {
    const respuesta = await fetchConReintento(url, {}, 3, 500);
    return respuesta.json();
  });
}

// FUNCION PRINCIPAL DEL CLIMA

async function obtenerClima() {
  const ciudad = document.getElementById("ciudad").value;
  const resultado = document.getElementById("resultado");

  resultado.textContent = "Buscando ubicacion...";

  try {
    // 1) Obtener coordenadas
    const urlGeo =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;

    const datosGeo = await obtenerJsonSeguro(urlGeo);

    if (!datosGeo.results || datosGeo.results.length === 0) {
      resultado.textContent = "Ciudad no encontrada";
      return;
    }

    const lugar = datosGeo.results[0];
    const lat = lugar.latitude;
    const lon = lugar.longitude;

    resultado.textContent = "Consultando clima...";

    // 2) Obtener clima
    const urlClima =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation` +
      `&timezone=auto`;

    const datosClima = await obtenerJsonSeguro(urlClima);

    const c = datosClima.current;

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
    if (error.message === "CIRCUITO_ABIERTO") {
      resultado.textContent =
        "El servicio está fallando. Intenta de nuevo en unos segundos.";
    } else {
      resultado.textContent =
        "Error al obtener el clima: " + error.message;
    }
  }
}
