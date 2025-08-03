#version 300 es

// Eingabedaten vom VAO
in vec3 a_position;   // Vertex-Position im Objekt
in vec2 a_uv;         // Texturkoordinaten
in vec3 a_normal;     // Normalenvektor

// Uniforms 
uniform mat4 u_modelMatrix;      // Modellmatrix: Objekt -> Welt
uniform mat4 u_viewMatrix;       // Viewmatrix: Welt -> Kamera
uniform mat4 u_projectionMatrix; // Projektionsmatrix: Kamera -> Clipspace

// Ausgaben an den Fragmentshader
out vec2 v_uv;           // Weitergereichte UV-Koordinaten
out vec3 v_normal;       // Transformierte Normalen im Weltkoordinatensystem
out vec3 v_worldPos;     // Weltkoordinaten des Vertex

void main() {
    // Weltkoordinaten berechnen
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);

    // Endposition im Clipspace (für die Rasterisierung)
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPos;

    // UV-Koordinaten weiterreichen
    v_uv = a_uv;

    // Weltkoordinaten weiterreichen
    v_worldPos = worldPos.xyz;

    // Normale transformieren (nur Rotation/Skalierung, keine Translation)
    v_normal = mat3(u_modelMatrix) * a_normal;

}
