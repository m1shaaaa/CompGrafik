async function main() {
	await initialize();
	setupSliders();
	setupCheckbox();
	requestAnimationFrame(render);
}

let gl;
let program;
let vaoSphere;
let vaoTorus;
let vaoCar;

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

let cameraRotation = { x: 15, y: 30 };
let isMouseDown = false;
let rotation = { x: 0, y: 0, z: 0 };
let sliderCameraDistance = 10;

let carMesh = null;
let enableAutoRotate = false;
let lastTime = 0;
let rotationY = 0;
let textureSun;

// Sonne
let sunRotationAngle = 0;
let sunRadius = 7;

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
	document.getElementById("slider-camd").addEventListener("input", (e) => {
		sliderCameraDistance = 5 + e.target.value / 100 * 15;
	});
}

function setupCheckbox() {
	const checkbox = document.getElementById("checkbox-autorotate");
	checkbox.addEventListener("change", (e) => {
		enableAutoRotate = e.target.checked;
	});
}

function setupCameraRotation() {
	const canvas = document.querySelector("canvas");
	canvas.onmousedown = (e) => { if (e.button === 0) isMouseDown = true; };
	document.onmouseup = () => isMouseDown = false;
	document.onmousemove = (e) => {
		if (isMouseDown) {
			cameraRotation.x += e.movementY * 0.2;
			cameraRotation.y += e.movementX * 0.2;
		}
	};
}

async function initialize() {
	const canvas = document.querySelector("canvas");
	gl = canvas.getContext("webgl2");
	if (!gl) return;

	canvas.width = 1000;
	canvas.height = 800;
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	const vertexShaderText = await loadTextResource("shader.vert");
	const fragmentShaderText = await loadTextResource("shader.frag");
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
	program = createProgram(gl, vertexShader, fragmentShader);

	uniformModelMatrixLocation = gl.getUniformLocation(program, "u_modelMatrix");
	uniformViewMatrixLocation = gl.getUniformLocation(program, "u_viewMatrix");
	uniformProjectionMatrixLocation = gl.getUniformLocation(program, "u_projectionMatrix");
	uniformColorLocation = gl.getUniformLocation(program, "u_color");
	uniformTextureLocation = gl.getUniformLocation(program, "u_texture");
	uniformUseTextureLocation = gl.getUniformLocation(program, "u_useTexture");
	uniformLightDirectionLocation = gl.getUniformLocation(program, "u_lightDirection");
	uniformLightColorLocation = gl.getUniformLocation(program, "u_lightColor");
	uniformAmbientColorLocation = gl.getUniformLocation(program, "u_ambientColor");

	setupCameraRotation();

	textureSphere = await loadImageTexture(gl, "compgrafik.png");
	textureTorus = await loadImageTexture(gl, "compgrafik2.png");
	textureSun = await loadImageTexture(gl, "sonne.png");

	vaoSphere = createVAO(sphereMesh, gl);
	vaoTorus = createVAO(torusMesh, gl);

	const objText = await loadTextResource("car.obj");
	const mtlText = await loadTextResource("car.mtl");
	carMesh = parseOBJ(objText);
	carMesh.materials = parseMTL(mtlText);
	vaoCar = createVAO(carMesh, gl);
}

function createVAO(mesh, gl) {
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	const posBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
	const posLoc = gl.getAttribLocation(program, "a_position");
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

	if (mesh.uvs && mesh.uvs.length > 0) {
		const uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
		const uvLoc = gl.getAttribLocation(program, "a_uv");
		gl.enableVertexAttribArray(uvLoc);
		gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
	}

	if (mesh.normals && mesh.normals.length > 0) {
		const normBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
		const normLoc = gl.getAttribLocation(program, "a_normal");
		gl.enableVertexAttribArray(normLoc);
		gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
	}

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
		rotationY += deltaTime * 0.5;
	}
	sunRotationAngle += deltaTime * 0.5;

	const sunX = Math.cos(sunRotationAngle) * sunRadius;
	const sunY = 3;
	const sunZ = Math.sin(sunRotationAngle) * sunRadius;
	const sunDirection = [-sunX, -sunY, -sunZ];

	gl.clearColor(0.1, 0.1, 0.1, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program);

	const aspect = gl.canvas.width / gl.canvas.height;
	const projection = perspective(45, aspect, 0.1, 100);
	const view = mat4Mul(
		mat4Translation(0, 0, -sliderCameraDistance),
		mat4Mul(mat4RotX(cameraRotation.x * Math.PI / 180), mat4RotY(cameraRotation.y * Math.PI / 180))
	);

	gl.uniformMatrix4fv(uniformViewMatrixLocation, true, view);
	gl.uniformMatrix4fv(uniformProjectionMatrixLocation, true, projection);

	gl.uniform3fv(uniformLightDirectionLocation, sunDirection);
	gl.uniform3fv(uniformLightColorLocation, [1.0, 1.0, 1.0]);
	gl.uniform3fv(uniformAmbientColorLocation, [0.2, 0.2, 0.2]);

	drawObject(vaoSphere, sphereMesh, textureSphere, mat4Translation(-3, 0, 0));
	drawObject(vaoTorus, torusMesh, textureTorus, mat4RotY(rotationY));

	if (carMesh && vaoCar) {
		const modelCar = mat4Mul(mat4Translation(3, 0, 0),
			mat4Mul(mat4RotX(rotation.x * Math.PI / 180),
				mat4Mul(mat4RotY(rotation.y * Math.PI / 180), mat4RotZ(rotation.z * Math.PI / 180)))
		);
		gl.uniformMatrix4fv(uniformModelMatrixLocation, true, modelCar);
		gl.bindVertexArray(vaoCar);

		for (const group of carMesh.materialGroups) {
			const mat = carMesh.materials[group.materialName];
			const color = mat?.Kd || [1, 1, 1];
			gl.uniform1i(uniformUseTextureLocation, false);
			gl.uniform3fv(uniformColorLocation, color);

			const groupBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groupBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(group.indices), gl.STATIC_DRAW);
			gl.drawElements(gl.TRIANGLES, group.indices.length, gl.UNSIGNED_SHORT, 0);
		}
		gl.bindVertexArray(null);
	}

	// ☀️ Die Sonne (sichtbar)
	const modelSun = mat4Translation(sunX, sunY, sunZ);
drawObject(vaoSphere, sphereMesh, textureSun, modelSun);

	requestAnimationFrame(render);
}

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
				const faceIndices = [];
				for (let i = 1; i <= 3; i++) {
					const key = parts[i];
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
				if (currentMaterial) {
					let group = materialGroups.find(g => g.materialName === currentMaterial);
					if (!group) {
						group = { materialName: currentMaterial, indices: [] };
						materialGroups.push(group);
					}
					group.indices.push(...faceIndices);
				}
				indices.push(...faceIndices);
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
