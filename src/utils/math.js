export const toRad = (deg) => (deg * Math.PI) / 180;
export const toDeg = (rad) => (rad * 180) / Math.PI;

// Convert polar coordinates (radius, angle) to Cartesian (x, y)
// Angle is in radians, 0 is pointing right (positive X), increasing counter-clockwise
export const polarToCartesian = (radius, angle) => {
    return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
    };
};

// Normalize angle to be between 0 and 2*PI
export const normalizeAngle = (angle) => {
    let a = angle % (2 * Math.PI);
    if (a < 0) a += 2 * Math.PI;
    return a;
};
