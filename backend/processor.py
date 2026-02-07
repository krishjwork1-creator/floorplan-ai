import cv2
import numpy as np
import uuid

def process_image(image_bytes):
    # 1. Decode
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Binary Threshold (Make it strictly Black & White)
    # Walls become White (255), Background becomes Black (0)
    _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

    # 3. SKELETONIZATION (The new magic step)
    # We erode the walls until they are 1 pixel wide
    skeleton = np.zeros(binary.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    done = False

    while not done:
        eroded = cv2.erode(binary, element)
        temp = cv2.dilate(eroded, element)
        temp = cv2.subtract(binary, temp)
        skeleton = cv2.bitwise_or(skeleton, temp)
        binary = eroded.copy()
        if cv2.countNonZero(binary) == 0:
            done = True

    # 4. Find Lines on the Skeleton
    # Notice we use 'skeleton' here, not 'edges'
    lines = cv2.HoughLinesP(skeleton, 1, np.pi/180, threshold=20, minLineLength=20, maxLineGap=10)

    walls = []
    SCALE = 0.02
    
    # We force a standard thickness for all walls
    STANDARD_THICKNESS = 0.2  # 20cm

    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2) * SCALE
            center_x = ((x1 + x2) / 2) * SCALE
            center_z = ((y1 + y2) / 2) * SCALE
            angle = np.arctan2(y2 - y1, x2 - x1)

            walls.append({
                "id": str(uuid.uuid4()), # Give every wall a unique ID
                "position": [center_x, 1, center_z], # Height is 2, so y=1 puts it on floor
                "size": [length, 2, STANDARD_THICKNESS], # [Length, Height, Thickness]
                "rotation": [0, -angle, 0]
            })

    return walls