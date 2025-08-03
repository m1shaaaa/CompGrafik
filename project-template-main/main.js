// Einstiegspunkt: Initialisiert alles und startet das Rendering
async function main() {
    await initialize();         // Lädt Shader, Objekte, Texturen, etc.
    setupSliders();             // Setzt die Event-Handler für die UI-Slider
    setupCheckbox();            // Setzt den Event-Handler für den Auto-Rotate-Checkbox
    setupSpacebarToggle();      // Spacebar schaltet Auto-Rotate um
    setupMouseWheelZoom();      // Ermöglicht Zoom mit dem Mausrad
    requestAnimationFrame(render); // Startet die Render-Schleife
}

// --- Globale Variablen für WebGL, Objekte, Texturen, Shader-Uniforms ---
let gl;
let program;
let vaoSphere;
let vaoTorus;
let vaoCar;
let vaoGround;

let textureSphere;
let textureTorus;

let uniformModelMatrixLocation;
let uniformViewMatrixLocation;
let uniformProjectionMatrixLocation;
let uniformColorLocation;
let uniformTextureLocation;
let uniformUseTextureLocation;
let uniformLightDirectionLocation;
let uniformLightColorLocation;
let uniformAmbientColorLocation;

let cameraRotation = { x: 10, y: 0 }; // Kamera schaut von vorne
let isMouseDown = false;                // Für Maussteuerung
let rotation = { x: 0, y: 0, z: 0 };    // Objektrotation (über Slider)
let sliderCameraDistance = 20;          // Startabstand der Kamera

let carMesh = null;                     // Mesh-Daten für das Auto
let groundMesh = null;                  // Mesh-Daten für den Boden
let enableAutoRotate = true;            // Automatische Rotation an/aus
let lastTime = 0;                       // Für DeltaTime-Berechnung
let rotationY = 0;                      // Y-Rotation für Torus

let textureSun;                         // Textur für die Sonne

// Sonne und Mond: Position, Radius, Textur 
let sunRotationAngle = 0;
let sunRadius = 7;

let moonRotationAngle = Math.PI;        // Mond startet gegenüber der Sonne
let moonRadius = sunRadius;
let textureMoon;


function setupSliders() {
    document.getElementById("slider-rx").addEventListener("input", (e) => {
        rotation.x = e.target.value / 100 * 360; 
    });
    document.getElementById("slider-ry").addEventListener("input", (e) => {
        rotation.y = e.target.value / 100 * 360; 
    });
    document.getElementById("slider-rz").addEventListener("input", (e) => {
        rotation.z = e.target.value / 100 * 360; 
    });
}

// Autorotation 
function setupCheckbox() {
    const checkbox = document.getElementById("checkbox-autorotate");
    checkbox.addEventListener("change", (e) => {
        enableAutoRotate = e.target.checked;
    });
}

//Kamera-Rotation per Maus 
function setupCameraRotation() {
    const canvas = document.querySelector("canvas");
    canvas.onmousedown = (e) => { if (e.button === 0) isMouseDown = true; };
    document.onmouseup = () => isMouseDown = false;
    document.onmousemove = (e) => {
        if (isMouseDown) {
            cameraRotation.x += e.movementY * 0.2; // Vertikal
            cameraRotation.y += e.movementX * 0.2; // Horizontal
            if (cameraRotation.x > 89) cameraRotation.x = 89;
            if (cameraRotation.x < -89) cameraRotation.x = -89;
        }
    };
}

// Zoom mit Mausrad 
function setupMouseWheelZoom() {
    const canvas = document.querySelector("canvas");
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        sliderCameraDistance += delta;
        if (sliderCameraDistance < 2) sliderCameraDistance = 2;
        if (sliderCameraDistance > 30) sliderCameraDistance = 30; // Maximalwert für Slider
    });
}

function setupSpacebarToggle() {
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            const checkbox = document.getElementById("checkbox-autorotate");
            checkbox.checked = !checkbox.checked;
            enableAutoRotate = checkbox.checked;
        }
    });
}

// Shader, Texturen, Objekte laden, VAOs erstellen 
async function initialize() {
    const canvas = document.querySelector("canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) return;

    canvas.width = 800;
    canvas.height = 800;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST); // Z-Buffer aktivieren
    gl.enable(gl.CULL_FACE);  // Rückseiten ausblenden

    // Shader laden und kompilieren
    const vertexShaderText = await loadTextResource("shader.vert");
    const fragmentShaderText = await loadTextResource("shader.frag");
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
    program = createProgram(gl, vertexShader, fragmentShader);

    // Uniform-Locations holen
    uniformModelMatrixLocation = gl.getUniformLocation(program, "u_modelMatrix");
    uniformViewMatrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
    uniformProjectionMatrixLocation = gl.getUniformLocation(program, "u_projectionMatrix");
    uniformColorLocation = gl.getUniformLocation(program, "u_color");
    uniformTextureLocation = gl.getUniformLocation(program, "u_texture");
    uniformUseTextureLocation = gl.getUniformLocation(program, "u_useTexture");
    uniformLightDirectionLocation = gl.getUniformLocation(program, "u_lightDirection");
    uniformLightColorLocation = gl.getUniformLocation(program, "u_lightColor");
    uniformAmbientColorLocation = gl.getUniformLocation(program, "u_ambientColor");

    // Kamera- und UI-Handler initialisieren
    setupCameraRotation();
    setupMouseWheelZoom();
    textureSphere = await loadImageTexture(gl, "compgrafik4.png");
    textureTorus = await loadImageTexture(gl, "compgrafik2.png");
    textureSun = await loadImageTexture(gl, "sonne.png");
    textureMoon = await loadImageTexture(gl, "compgrafik3.png");

    // VAOs für primitive Objekte
    vaoSphere = createVAO(sphereMesh, gl);
    vaoTorus = createVAO(torusMesh, gl);

    // Auto-Objekt laden und VAO erstellen
    const objText = await loadTextResource("car.obj");
    const mtlText = await loadTextResource("car.mtl");
    carMesh = parseOBJ(objText);
    carMesh.materials = parseMTL(mtlText);
    vaoCar = createVAO(carMesh, gl);

    // Boden-Objekt laden und VAO erstellen
    const groundObjText = await loadTextResource("ground.obj");
    const groundMtlText = await loadTextResource("ground.mtl");
    groundMesh = parseOBJ(groundObjText);
    groundMesh.materials = parseMTL(groundMtlText);
    vaoGround = createVAO(groundMesh, gl);

    // Checkbox von Anfang an aktivieren
    document.getElementById("checkbox-autorotate").checked = true;
}

// VAO für ein Mesh erstellen 
function createVAO(mesh, gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Positionen
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // UV-Koordinaten (Textur)
    if (mesh.uvs && mesh.uvs.length > 0) {
        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
        const uvLoc = gl.getAttribLocation(program, "a_uv");
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Licht normals
    if (mesh.normals && mesh.normals.length > 0) {
        const normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
        const normLoc = gl.getAttribLocation(program, "a_normal");
        gl.enableVertexAttribArray(normLoc);
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
    }

    // Indices (welche Vertices bilden ein Dreieck)
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return vao;
}

function render(currentTime) {
    const deltaTime = (currentTime - lastTime) * 0.001;
    lastTime = currentTime;

    if (enableAutoRotate) {
        rotationY += deltaTime * 0.35;
        sunRotationAngle += deltaTime * 0.35;
        moonRotationAngle += deltaTime * 0.35;
    }

    // Sonnen- und Mondposition berechnen (Kreisbahn)
    const sunX = Math.sin(sunRotationAngle) * sunRadius;
    const sunY = Math.cos(sunRotationAngle) * sunRadius;
    const sunZ = 0;
    const sunDirection = [-sunX, -sunY, -sunZ];

    const moonX = Math.sin(moonRotationAngle) * moonRadius;
    const moonY = Math.cos(moonRotationAngle) * moonRadius;
    const moonZ = 0;
    const moonDirection = [-moonX, -moonY, -moonZ];

    // Framebuffer leeren und Shader aktivieren
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    // Projektions- und View-Matrix berechnen (Kamera)
    const aspect = gl.canvas.width / gl.canvas.height;
    const projection = perspective(45, aspect, 0.1, 100);
    const view = mat4Mul(
        mat4Translation(0, 0, -sliderCameraDistance),
        mat4Mul(mat4RotX(cameraRotation.x * Math.PI / 180), mat4RotY(cameraRotation.y * Math.PI / 180))
    );

    gl.uniformMatrix4fv(uniformViewMatrixLocation, true, view);
    gl.uniformMatrix4fv(uniformProjectionMatrixLocation, true, projection);

    // Lichtlogik 
    if (sunY > -1 ){
        gl.uniform3fv(uniformLightDirectionLocation, sunDirection);
        gl.uniform3fv(uniformLightColorLocation, [0.9, 0.9, 0.9]);
        gl.uniform3fv(uniformAmbientColorLocation, [0.1, 0.1, 0.1]);
    } else if (moonY > -1) {
        gl.uniform3fv(uniformLightDirectionLocation, moonDirection);
        gl.uniform3fv(uniformLightColorLocation, [0.2, 0.2, 0.3]);
        gl.uniform3fv(uniformAmbientColorLocation, [0.05, 0.05, 0.1]);
    } else {
        // Schwaches Nachtlicht, wenn beide unter dem Horizont
        gl.uniform3fv(uniformLightDirectionLocation, [0, -1, 0]);
        gl.uniform3fv(uniformLightColorLocation, [0.05, 0.05, 0.1]);
        gl.uniform3fv(uniformAmbientColorLocation, [0.01, 0.01, 0.02]);
    }

    // Sonne (mit Textur)
    gl.uniform1i(gl.getUniformLocation(program, "u_isSun"), true);
    gl.uniform1f(gl.getUniformLocation(program, "u_uvScale"), 1.0);
    const modelSun = mat4Translation(sunX, sunY, sunZ);
    drawObject(vaoSphere, sphereMesh, textureSun, modelSun);

    // Mond (mit Textur)
    gl.uniform1i(gl.getUniformLocation(program, "u_isSun"), true);
    gl.uniform1f(gl.getUniformLocation(program, "u_uvScale"), 1.0);
    const modelMoon = mat4Translation(moonX, moonY, moonZ);
    drawObject(vaoSphere, sphereMesh, textureMoon, modelMoon);

    // Kugel und Torus (mit Textur)
    gl.uniform1i(gl.getUniformLocation(program, "u_isSun"), false);
    gl.uniform1f(gl.getUniformLocation(program, "u_uvScale"), 1.0);
    drawObject(vaoSphere, sphereMesh, textureSphere, mat4Translation(-3, 0, 0));
    drawObject(vaoTorus, torusMesh, textureTorus, mat4RotY(rotationY));

    // Auto (mit Materialfarben aus MTL)
    if (carMesh && vaoCar) {
        const modelCar = mat4Mul(mat4Translation(3, 0, 0),
            mat4Mul(mat4RotX(rotation.x * Math.PI / 180),
                mat4Mul(mat4RotY(rotation.y * Math.PI / 180), mat4RotZ(rotation.z * Math.PI / 180)))
        );
        gl.uniformMatrix4fv(uniformModelMatrixLocation, true, modelCar);
        gl.bindVertexArray(vaoCar);

        for (const group of carMesh.materialGroups) {
            const mat = carMesh.materials[group.materialName];
            const color = mat?.Kd || [1, 1, 1]; // Diffuse-Farbe
            gl.uniform1i(uniformUseTextureLocation, false); // Keine Textur
            gl.uniform3fv(uniformColorLocation, color);

            const groupBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groupBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(group.indices), gl.STATIC_DRAW);
            gl.drawElements(gl.TRIANGLES, group.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        gl.bindVertexArray(null);
    }

    // Boden (ohne Textur, nur Farbe)
    if (groundMesh && vaoGround) {
        const modelGround = mat4Translation(0, -1.0, 0);
        gl.uniformMatrix4fv(uniformModelMatrixLocation, true, modelGround);
        gl.bindVertexArray(vaoGround);

        for (const group of groundMesh.materialGroups) {
            const mat = groundMesh.materials[group.materialName];
            const color = mat?.Kd || [0.5, 0.5, 0.5];
            gl.uniform1i(uniformUseTextureLocation, false); // Nur Farbe, keine Textur
            gl.uniform3fv(uniformColorLocation, color);

            const groupBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groupBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(group.indices), gl.STATIC_DRAW);
            gl.drawElements(gl.TRIANGLES, group.indices.length, gl.UNSIGNED_SHORT, 0);
        }
        gl.bindVertexArray(null);
    }

    requestAnimationFrame(render); 
}

// Zeichnet ein Objekt mit Textur und Model-Matrix 
function drawObject(vao, mesh, texture, modelMatrix) {
    const model = mat4Mul(modelMatrix,
        mat4Mul(mat4RotX(rotation.x * Math.PI / 180),
            mat4Mul(mat4RotY(rotation.y * Math.PI / 180), mat4RotZ(rotation.z * Math.PI / 180)))
    );
    gl.uniformMatrix4fv(uniformModelMatrixLocation, true, model);
    gl.uniform1i(uniformUseTextureLocation, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniformTextureLocation, 0);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}

// Bild als WebGL-Textur laden 
async function loadImageTexture(gl, url) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
}

// OBJ-Parser: Liest Positionen, UVs, Normalen, Faces, Materialgruppen 
function parseOBJ(text) {
    const positions = [], uvs = [], normals = [];
    const finalPositions = [], finalUVs = [], finalNormals = [], indices = [];
    const materialGroups = [];
    const indexMap = new Map();
    let currentMaterial = null;

    const lines = text.split("\n");
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (!parts.length || parts[0].startsWith("#")) continue;
        switch (parts[0]) {
            case "v": positions.push(...parts.slice(1).map(Number)); break;
            case "vt": uvs.push(...parts.slice(1).map(Number)); break;
            case "vn": normals.push(...parts.slice(1).map(Number)); break;
            case "usemtl": currentMaterial = parts[1]; break;
            case "f":
                const faceKeys = parts.slice(1);
                const faceIndices = [];
                for (const key of faceKeys) {
                    if (!indexMap.has(key)) {
                        const [v, vt, vn] = key.split("/").map(i => parseInt(i) - 1);
                        const pos = positions.slice(v * 3, v * 3 + 3);
                        const uv = vt >= 0 ? uvs.slice(vt * 2, vt * 2 + 2) : [0, 0];
                        const norm = vn >= 0 ? normals.slice(vn * 3, vn * 3 + 3) : [0, 0, 0];
                        const idx = finalPositions.length / 3;
                        indexMap.set(key, idx);
                        finalPositions.push(...pos);
                        finalUVs.push(...uv);
                        finalNormals.push(...norm);
                    }
                    faceIndices.push(indexMap.get(key));
                }
                // Trianguliere Face , damit Webgl es korrekt rendern kann 
                for (let i = 1; i < faceIndices.length - 1; i++) {
                    const tri = [faceIndices[0], faceIndices[i], faceIndices[i + 1]];
                    if (currentMaterial) {
                        let group = materialGroups.find(g => g.materialName === currentMaterial);
                        if (!group) {
                            group = { materialName: currentMaterial, indices: [] };
                            materialGroups.push(group);
                        }
                        group.indices.push(...tri);
                    }
                    indices.push(...tri);
                }
                break;
        }
    }
    return {
        positions: finalPositions,
        uvs: finalUVs,
        normals: finalNormals,
        indices,
        materialGroups
    };
}

// MTL-Parser: Liest Materialeigenschaften aus MTL-Datei 
function parseMTL(text) {
    const materials = {};
    let current = null;
    const lines = text.split("\n");
    for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line || line.startsWith("#")) continue;
        const parts = line.split(/\s+/);
        const cmd = parts[0];
        switch (cmd) {
            case "newmtl": current = parts[1]; materials[current] = {}; break;
            case "Ka": materials[current].Ka = parts.slice(1).map(Number); break;
            case "Kd": materials[current].Kd = parts.slice(1).map(Number); break;
            case "Ks": materials[current].Ks = parts.slice(1).map(Number); break;
            case "Ke": materials[current].Ke = parts.slice(1).map(Number); break;
            case "Ns": materials[current].Ns = parseFloat(parts[1]); break;
            case "d": materials[current].d = parseFloat(parts[1]); break;
            case "Ni": materials[current].Ni = parseFloat(parts[1]); break;
            case "illum": materials[current].illum = parseInt(parts[1]); break;
        }
    }
    return materials;
}

main();
