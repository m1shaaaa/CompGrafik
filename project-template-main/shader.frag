#version 300 es
precision highp float;

// Eingaben vom Vertexshader
in vec2 v_uv;         // Interpolierte Texturkoordinaten
in vec3 v_normal;     // Interpolierte Normale im Weltkoordinatensystem

// Uniforms 
uniform bool u_useTexture;         // true: Textur verwenden, false: nur Farbe
uniform sampler2D u_texture;       // Textur (falls verwendet)
uniform vec3 u_color;              // Objektfarbe (falls keine Textur)

uniform vec3 u_lightDirection;     // Richtung der Lichtquelle (Welt)
uniform vec3 u_lightColor;         // Lichtfarbe
uniform vec3 u_ambientColor;       // Umgebungslichtfarbe
uniform bool u_isSun;              // true: Sonne, false: andere Objekte

uniform float u_uvScale;           // UV-Skalierung (z.B. für Mondtextur)

// Ausgabe: finale Farbe des Pixels
out vec4 outColor;

void main() {
    // UV-Koordinaten skalieren (Mond)
    vec2 uv = v_uv * u_uvScale;

    // Sonne
    if (u_isSun) {
        
        outColor = texture(u_texture, uv) * vec4(0.6, 0.6, 0.6, 1.0);
        return;
    }

    //  Mond
    if (!u_isSun && u_useTexture && u_color == vec3(1.0, 1.0, 1.0)) {
        
        outColor = texture(u_texture, uv * 0.1);
        return;
    }

    // Lichtberechnung 

    // Normale und Lichtvektor normalisieren
    vec3 norm = normalize(v_normal);
    vec3 lightDir = normalize(-u_lightDirection);

    //Diffuslicht (Winkel zwischen Licht und Normale)
    float diff = max(dot(norm, lightDir), 0.0);

    // Toon-Stufen für Cartoon-Look
    float intensity;
    if (diff > 0.95) intensity = 1.0;
    else if (diff > 0.5) intensity = 0.7;
    else if (diff > 0.25) intensity = 0.4;
    else intensity = 0.1;

    // Diffus- und Umgebungslicht berechnen
    vec3 diffuse = intensity * u_lightColor;
    vec3 ambient = u_ambientColor;

    // Basisfarbe
    vec4 baseColor = u_useTexture
        ? texture(u_texture, uv)
        : vec4(u_color, 1.0);

    // Endgültige Farbe berechnen (Farbe * (Umgebungslicht + Diffuslicht))
    vec3 finalColor = baseColor.rgb * (ambient + diffuse);
    outColor = vec4(finalColor, 1.0);
}
