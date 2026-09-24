// ==========================================================================
// 1. CAPTURA DE ELEMENTOS DEL DOM (Identificar las piezas en el HTML)
// ==========================================================================
const selectModo = document.getElementById('select-modo');
const grupoTema = document.getElementById('grupo-tema');

// ==========================================================================
// 2. ESCUCHADOR DE EVENTOS (Vigilar los cambios del usuario)
// ==========================================================================
selectModo.addEventListener('change', function() {
    // Averiguamos qué opción ha seleccionado el usuario
    const modoSeleccionado = selectModo.value;

    // Si el usuario elige "Test por Tema", mostramos el selector de temas
    if (modoSeleccionado === 'tema') {
        grupoTema.classList.remove('id-oculto');
    } else {
        // Si elige "Examen Global" o vuelve a poner la opción vacía, lo escondemos
        grupoTema.classList.add('id-oculto');
    }
});
// ==========================================================================
// 3. VARIABLES DE ESTADO (La memoria temporal del test)
// ==========================================================================
let bancoPreguntasCompleto = []; // Aquí guardaremos TODAS las preguntas del JSON

// ==========================================================================
// 4. CARGAR LOS DATOS (Leer el archivo preguntas.json)
// ==========================================================================
function cargarPreguntas() {
    fetch('preguntas.json')
        .then(respuesta => {
            // Convertimos el archivo de texto plano a un formato que JS entienda (Objeto)
            return respuesta.json(); 
        })
        .then(datos => {
            // Guardamos las preguntas en nuestra variable para usarlas cuando queramos
            bancoPreguntasCompleto = datos;
            console.log("¡Datos cargados con éxito! Preguntas encontradas:", bancoPreguntasCompleto.length);
        })
        .catch(error => {
            console.error("Hubo un error al cargar las preguntas:", error);
        });
}

// Ejecutamos la función de carga nada más abrir la página
cargarPreguntas();
// ==========================================================================
// 5. CAPTURA DE NUEVOS ELEMENTOS (Para el inicio del test)
// ==========================================================================
const selectAsignatura = document.getElementById('select-asignatura');
const selectTema = document.getElementById('select-tema');
const btnComenzar = document.getElementById('btn-comenzar');

const pantallaConfig = document.getElementById('pantalla-config');
const pantallaTest = document.getElementById('pantalla-test');

// Variables para controlar el test por dentro
let preguntasFiltradas = []; // Las preguntas que entran en ESTE examen
let indicePreguntaActual = 0; // Por qué pregunta va el usuario (0 es la primera)
let tiempoSegundos = 0; // Guardará el total de segundos transcurridos
let idCronometro;       // Guardará el "mando a distancia" para poder parar el reloj
const cronometroElemento = document.getElementById('cronometro'); // Capturamos el <span> del HTML

// ==========================================================================
// 6. EVENTO CLIC EN "COMENZAR TEST"
// ==========================================================================
btnComenzar.addEventListener('click', function() {
    const asignaturaElegida = selectAsignatura.value;
    const modoElegido = selectModo.value;
    const temaElegido = selectTema.value;

    // VALIDACIÓN BÁSICA: Obligar al usuario a elegir las opciones antes de pasar
    if (asignaturaElegida === "" || modoElegido === "") {
        alert("Por favor, selecciona una Asignatura y un Modo de Test.");
        return; // Detiene el código aquí si falta algo
    }

    if (modoElegido === "tema" && temaElegido === "") {
        alert("Has elegido test por tema. Por favor, selecciona qué tema quieres repasar.");
        return;
    }

    // PASO 1: Filtrar las preguntas según lo que el usuario ha elegido
    filtrarPreguntas(asignaturaElegida, modoElegido, temaElegido);

    // PASO 2: Si por algún motivo la lista está vacía, avisamos
    if (preguntasFiltradas.length === 0) {
        alert("No se encontraron preguntas para esa combinación en el archivo JSON.");
        return;
    }

    // PASO 3: Cambio de pantalla (Ocultamos el menú y mostramos el test)
    pantallaConfig.classList.add('id-oculto'); 
    pantallaTest.classList.remove('id-oculto'); 

    // PASO 4: Resetear el índice a la primera pregunta (0) y pintarla
    indicePreguntaActual = 0;
    mostrarPreguntaEnPantalla();
    iniciarCronometro(); // <-- Añade esta línea aquí al final
});


// ==========================================================================
// 7. FUNCIÓN PARA FILTRAR LAS PREGUNTAS
// ==========================================================================
function filtrarPreguntas(asignatura, modo, tema) {
    // Usamos .filter() para buscar en todo el almacén de tus 210 preguntas
    preguntasFiltradas = bancoPreguntasCompleto.filter(pregunta => {
        const coincideAsignatura = pregunta.Asignatura === asignatura;
        
        if (modo === "global") {
            return coincideAsignatura; // Si es global, entran todos los temas
        } else {
            // Si es por tema, tiene que coincidir la asignatura Y el número de tema
            return coincideAsignatura && pregunta.Tema == tema;
        }
    });
    // Barajamos todas las preguntas que han pasado el filtro
    preguntasFiltradas = barajarArray(preguntasFiltradas);
    
    // De momento recortamos la lista para cumplir tus reglas (10 para tema, 40 para global)
    // Más adelante programaremos aquí el algoritmo para barajarlas (mezclarlas)
    if (modo === "tema") {
        preguntasFiltradas = preguntasFiltradas.slice(0, 10);
    } else if (modo === "global") {
        preguntasFiltradas = preguntasFiltradas.slice(0, 40);
    }
}
// ==========================================================================
// 8. FUNCIÓN PARA MOSTRAR LA PREGUNTA ACTUAL EN PANTALLA
// ==========================================================================
function mostrarPreguntaEnPantalla() {
    // Limpiamos el feedback visual del clic anterior
    const divFeedback = document.getElementById('feedback');
    const btnSiguiente = document.getElementById('btn-siguiente');
    divFeedback.classList.add('id-oculto');
    divFeedback.innerHTML = "";
    
    btnSiguiente.textContent = "Saltar / Siguiente Pregunta";

    // Extraemos los datos de la pregunta que toca ahora mismo
    const preguntaActual = preguntasFiltradas[indicePreguntaActual];

    // Actualizamos el contador superior de la pantalla ("Pregunta 1 de 10")
    document.getElementById('progreso-preguntas').textContent = `Pregunta ${indicePreguntaActual + 1} de ${preguntasFiltradas.length}`;

    // Ponemos el enunciado real en el título
    document.getElementById('enunciado').textContent = preguntaActual.Enunciado;

    // Capturamos la caja de las opciones y la vaciamos
    const contenedorOpciones = document.getElementById('opciones');
    contenedorOpciones.innerHTML = ""; 

    // Creamos una lista de objetos. Cada opción lleva pegada la información de si es la buena o no.
    let opcionesEstructuradas = [
        { texto: preguntaActual.Opcion_0, esCorrecta: preguntaActual.Correcta == 0 },
        { texto: preguntaActual.Opcion_1, esCorrecta: preguntaActual.Correcta == 1 },
        { texto: preguntaActual.Opcion_2, esCorrecta: preguntaActual.Correcta == 2 },
        { texto: preguntaActual.Opcion_3, esCorrecta: preguntaActual.Correcta == 3 }
    ];

    opcionesEstructuradas = barajarArray(opcionesEstructuradas);

    // Recorremos los textos y fabricamos un botón HTML real para cada uno
    opcionesEstructuradas.forEach((opcion, indiceOpcion) => {
        const boton = document.createElement('button');
        boton.className = 'btn-opcion'; // Le damos la clase CSS para que se vea bonito
        boton.textContent = opcion.texto;

        // Si esta opción es la verdadera, nos guardamos su nueva posición en la pantalla
        if (opcion.esCorrecta) {
            preguntaActual.NUEVO_indiceCorrecto = indiceOpcion;
        }
        // ================================

        // Le asignamos el evento clic a cada respuesta
        boton.addEventListener('click', function() {
            verificarRespuestaUsuario(indiceOpcion);
        });

        contenedorOpciones.appendChild(boton);
    });
}

// ==========================================================================
// 9. FUNCIÓN QUE COMPRUEBA LA RESPUESTA SELECCIONADA
// ==========================================================================
let respuestasDelExamen = []; // Aquí guardaremos el historial para el repaso final

function verificarRespuestaUsuario(indiceSeleccionado) {
    const preguntaActual = preguntasFiltradas[indicePreguntaActual];
    const divFeedback = document.getElementById('feedback');
    const btnSiguiente = document.getElementById('btn-siguiente');
    
    // Bloqueamos los 4 botones para que el usuario no pueda cambiar de opinión
    const botonesOpciones = document.querySelectorAll('.btn-opcion');
    botonesOpciones.forEach(b => b.disabled = true);

    const indiceCorrecto = preguntaActual.NUEVO_indiceCorrecto;

    divFeedback.classList.remove('id-oculto');
    btnSiguiente.textContent = "Siguiente Pregunta"; 

    // Comparamos el número del botón clicado con el del campo "Correcta" de tu Excel
    if (indiceSeleccionado === indiceCorrecto) {
        divFeedback.innerHTML = "<p class='mensaje-acierto'>¡Correcto! Sigue así.</p>";
        botonesOpciones[indiceSeleccionado].classList.add('opcion-correcta'); // Se vuelve verde
        
        // Guardamos que ha acertado en el historial
        respuestasDelExamen[indicePreguntaActual] = {
            pregunta: preguntaActual,
            estado: "acierto",
            seleccionada: indiceSeleccionado
        };
    } else {
        divFeedback.innerHTML = "<p class='mensaje-fallo'>¡Has fallado!</p>";
        botonesOpciones[indiceSeleccionado].classList.add('opcion-erronea'); // El suyo se vuelve rojo
        botonesOpciones[indiceCorrecto].classList.add('opcion-correcta'); // La solución se vuelve verde
        
        // Guardamos que ha fallado en el historial
        respuestasDelExamen[indicePreguntaActual] = {
            pregunta: preguntaActual,
            estado: "fallo",
            seleccionada: indiceSeleccionado
        };
    }
}
// ==========================================================================
// 10. EVENTO CLIC EN "SIGUIENTE PREGUNTA"
// ==========================================================================
const btnSiguiente = document.getElementById('btn-siguiente');

btnSiguiente.addEventListener('click', function() {
    // Incrementamos el índice para avanzar una posición en el array
    indicePreguntaActual++;

    // Comprobamos si todavía quedan preguntas por responder
    if (indicePreguntaActual < preguntasFiltradas.length) {
        // Si quedan preguntas, pintamos la siguiente
        mostrarPreguntaEnPantalla();
    } else {
        // Si hemos llegado al final, mostramos la pantalla de resultados
        finalizarTest();
    }
});

// ==========================================================================
// 11. FUNCIÓN PARA FINALIZAR EL TEST Y MOSTRAR RESULTADOS
// ==========================================================================
function finalizarTest() {
    // 1. Apagamos el cronómetro
    clearInterval(idCronometro);

    // 2. Ocultamos la pantalla del test
    pantallaTest.classList.add('id-oculto');
    
    // 3. Mostramos la pantalla de resumen
    const pantallaResumen = document.getElementById('pantalla-resumen');
    pantallaResumen.classList.remove('id-oculto');
    
    // 4. Calculamos los datos del examen
    const aciertos = respuestasDelExamen.filter(r => r && r.estado === "acierto").length;
    const fallos = respuestasDelExamen.filter(r => r && r.estado === "fallo").length;
    const totalPreguntas = preguntasFiltradas.length;
    
    let noContestadas = 0;
    for (let i = 0; i < totalPreguntas; i++) {
        if (!respuestasDelExamen[i]) {
            noContestadas++;
        }
    }

    // Calculamos la nota (sobre 10)
    const nota = ((aciertos / totalPreguntas) * 10).toFixed(2);
    
    // 5. Inyectamos los datos numéricos en tu HTML
    document.getElementById('txt-nota').textContent = nota;
    document.getElementById('txt-aciertos').textContent = aciertos;
    document.getElementById('txt-fallos').textContent = fallos;
    document.getElementById('txt-blancos').textContent = noContestadas;

    // ======================================================================
    // MAGIA DEL GRÁFICO CIRCULAR (conic-gradient dinámico)
    // ======================================================================
    // Convertimos los resultados a porcentajes sobre los 360 grados de un círculo
    const gradosAciertos = (aciertos / totalPreguntas) * 360;
    const gradosFallos = (fallos / totalPreguntas) * 360;

    // Calculamos dónde termina cada "quesito" sumando el anterior
    const limiteVerde = gradosAciertos;
    const limiteRojo = limiteVerde + gradosFallos;

    // Capturamos el círculo gris del HTML
    const circuloGrafico = document.getElementById('grafico-circular');

    // Le aplicamos el degradado cónico con tus variables de color reales
    circuloGrafico.style.background = `conic-gradient(
        var(--color-acierto) 0deg ${limiteVerde}deg,
        var(--color-fallo) ${limiteVerde}deg ${limiteRojo}deg,
        #e5e5e5 ${limiteRojo}deg 360deg
    )`;

    // 6. Programamos el botón de reiniciar para volver al menú principal
    document.getElementById('btn-reiniciar').addEventListener('click', function() {
        window.location.reload();
    });
}
// ==========================================================================
// 12. CONTROL DEL CRONÓMETRO (Tiempo del test)
// ==========================================================================
function iniciarCronometro() {
    // Nos aseguramos de resetear el tiempo a cero por si venimos de otro test
    tiempoSegundos = 0;
    clearInterval(idCronometro); 

    // Arrancamos el intervalo para que se ejecute cada 1000 milisegundos (1 segundo)
    idCronometro = setInterval(function() {
        tiempoSegundos++;

        // Calculamos los minutos y los segundos independientes
        let minutos = Math.floor(tiempoSegundos / 60);
        let segundos = tiempoSegundos % 60;

        // Añadimos un cero a la izquierda si el número es menor que 10
        let minutosTexto = minutos < 10 ? "0" + minutos : minutos;
        let segundosTexto = segundos < 10 ? "0" + segundos : segundos;

        // Pintamos el resultado en el HTML
        cronometroElemento.textContent = `${minutosTexto}:${segundosTexto}`;
    }, 1000);
}
// ==========================================================================
// 13. ALGORITMO DE BARAJADO (Fisher-Yates)
// ==========================================================================
function barajarArray(array) {
    // Recorremos el array desde el final hasta el principio
    for (let i = array.length - 1; i > 0; i--) {
        // Elegimos un índice aleatorio entre 0 e i
        const j = Math.floor(Math.random() * (i + 1));
        // Intercambiamos los elementos de la posición i y j
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}