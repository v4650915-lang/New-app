/**
 * Converts Degrees-Minutes-Seconds to Decimal Degrees
 * @param {number} d - Degrees
 * @param {number} m - Minutes
 * @param {number} s - Seconds
 * @returns {number} Decimal degrees
 */
export function dmsToDecimal(d: number, m: number, s: number): number {
    return d + m / 60 + s / 3600;
}

/**
 * Converts Decimal Degrees to Degrees-Minutes-Seconds
 * @param {number} decimal - Decimal degrees
 * @returns {object} {d, m, s} - Rounded to 4 decimal places for seconds
 */
export function decimalToDms(decimal: number): { d: number, m: number, s: number } {
    const d = Math.floor(decimal);
    const mFull = (decimal - d) * 60;
    const m = Math.floor(mFull);
    const s = (mFull - m) * 60;
    return { d, m, s: parseFloat(s.toFixed(4)) };
}

/**
 * Calculates trigonometric functions for an angle in degrees
 * @param {number} angleInDegrees 
 * @returns {object} { sin, cos, tan, cot, sec, csc }
 */
export function calculateTrig(angleInDegrees: number) {
    const rad = (angleInDegrees * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const tan = Math.tan(rad);

    return {
        sin: parseFloat(sin.toFixed(6)),
        cos: parseFloat(cos.toFixed(6)),
        tan: parseFloat(tan.toFixed(6)),
        cot: tan !== 0 ? parseFloat((1 / tan).toFixed(6)) : 'Infinity',
        sec: cos !== 0 ? parseFloat((1 / cos).toFixed(6)) : 'Infinity',
        csc: sin !== 0 ? parseFloat((1 / sin).toFixed(6)) : 'Infinity'
    };
}

/**
 * Calculates sphere profile parameters for a barrel shape
 * @param {number} L - Length of the part
 * @param {number} D - Outer Diameter (at center Z=0)
 * @param {number} R - Radius of the main sphere
 * @param {number} r - Radius of the corner fillet
 * @returns {object} Calculated parameters and points
 */
export function calculateSphereProfile(L: number, D: number, R: number, r: number) {
    // Validate inputs
    if (L <= 0 || D <= 0 || R <= 0 || r < 0) return null;
    if (R <= D / 2) {
        // Technically sphere radius should be larger than half diameter for a barrel, 
        // or at least large enough to form the shape. 
        // We'll proceed but it might look weird if R is small.
    }

    // Coordinate System: Z is horizontal, X is vertical (Radius)
    // Part Center is (0, 0)

    // 1. Main Sphere Center (Cs)
    // The sphere Apex is at (0, D/2).
    // So Center X is D/2 - R.
    // Center Z is 0.
    const Cs = { z: 0, x: D / 2 - R };

    // 2. Corner Fillet Center (Cf)
    // The fillet is tangent to the vertical face line at Z = L/2.
    // So Cf.z = L/2 - r.
    const Cf_z = L / 2 - r;

    // The fillet is tangent to the Main Sphere.
    // Distance between Cs and Cf must be (R - r).
    // (Cf.z - Cs.z)^2 + (Cf.x - Cs.x)^2 = (R - r)^2
    // (L/2 - r)^2 + (Cf.x - (D/2 - R))^2 = (R - r)^2

    // Let dz = L/2 - r.
    // Let dx = Cf.x - (D/2 - R).
    // dx^2 = (R - r)^2 - dz^2
    const distSq = Math.pow(R - r, 2);
    const dzSq = Math.pow(Cf_z, 2);

    if (dzSq > distSq) {
        return { error: "Geometry impossible: Length is too large for the given Sphere Radius." };
    }

    const dx = Math.sqrt(distSq - dzSq);

    // Cf.x could be (D/2 - R) + dx OR (D/2 - R) - dx.
    // For a convex barrel, the fillet center should be "outwards" from the sphere center?
    // Usually X is positive.
    // (D/2 - R) is negative (since R > D/2 usually).
    // We expect Cf.x to be positive (near the surface).
    const Cf_x = Cs.x + dx;

    // 3. Tangent Points

    // Tangent 1: Sphere to Fillet (T1)
    // Lies on vector Cs -> Cf.
    // T1 = Cs + (Cf - Cs) * (R / (R - r)) ... Ratio is R / distance?
    // No, vector from Cs to Cf has length (R - r).
    // Vector from Cs to T1 has length R.
    // So T1 = Cs + (Cf - Cs) * (R / (R - r)).
    const ratio = R / (R - r);
    const T1 = {
        z: Cs.z + (Cf_z - Cs.z) * ratio,
        x: Cs.x + (Cf_x - Cs.x) * ratio
    };

    // Tangent 2: Fillet to Face (T2)
    // Tangent to vertical line Z = L/2.
    // T2 = (L/2, Cf_x)
    const T2 = {
        z: L / 2,
        x: Cf_x
    };

    // 4. Segment Height (h)
    // Sagitta of the main sphere over length L (ignoring fillet for a moment, or pure sphere drop)
    // h = R - sqrt(R^2 - (L/2)^2)
    // This is the standard "Segment Height" formula for a chord L.
    const h_sagitta = R - Math.sqrt(Math.pow(R, 2) - Math.pow(L / 2, 2));

    const distB = Math.abs(L / 2 - T1.z);

    const tangents = [
        {
            label: "A (Правый торец → Скругление)",
            z: 0,
            diameter: T2.x * 2
        },
        {
            label: "B (Скругление → Сфера)",
            z: -distB,
            diameter: T1.x * 2
        },
        {
            label: "C (Сфера → Левое скругление)",
            z: -(L - distB),
            diameter: T1.x * 2
        },
        {
            label: "D (Левое скругление → Левый торец)",
            z: -L,
            diameter: T2.x * 2
        }
    ];

    return {
        Cs,
        Cf: { z: Cf_z, x: Cf_x },
        T1,
        T2,
        h_sagitta: parseFloat(h_sagitta.toFixed(4)),
        h_drop: parseFloat((D / 2 - T2.x).toFixed(4)),
        faceDiameter: parseFloat((T2.x * 2).toFixed(4)),
        tangents: tangents.map(t => ({
            ...t,
            z: parseFloat(t.z.toFixed(4)),
            diameter: parseFloat(t.diameter.toFixed(4))
        }))
    };
}
