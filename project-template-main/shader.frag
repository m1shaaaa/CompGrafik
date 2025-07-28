#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_worldPos;

uniform bool u_useTexture;
uniform sampler2D u_texture;
uniform vec3 u_color;

uniform vec3 u_lightDirection;
uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;

out vec4 outColor;

void main() {
    vec3 norm = normalize(v_normal);
    vec3 lightDir = normalize(-u_lightDirection);

    // Klassisches Lambert-Produkt
    float diff = max(dot(norm, lightDir), 0.0);

    // Toon-Stufen definieren
    float intensity;
    if (diff > 0.95) intensity = 1.0;
    else if (diff > 0.5) intensity = 0.7;
    else if (diff > 0.25) intensity = 0.4;
    else intensity = 0.1;

    vec3 diffuse = intensity * u_lightColor;
    vec3 ambient = u_ambientColor;

    vec4 baseColor = u_useTexture
        ? texture(u_texture, v_uv)
        : vec4(u_color, 1.0);

    vec3 finalColor = baseColor.rgb * (ambient + diffuse);
    outColor = vec4(finalColor, 1.0);
}
