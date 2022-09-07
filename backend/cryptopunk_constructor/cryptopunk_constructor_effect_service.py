import io
from typing import Dict
from typing import List
from typing import Optional

import imageio
import numpy as np
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont


class CryptopunkConstructorEffectService:

    async def transform(self, contents: List, params: Optional[Dict] = None):
        result = self._perform_transformation(contents, params)
        return result

    def _perform_transformation(
            self, contents: List, params: Optional[Dict] = None,
    ) -> bytes:
        punk = contents[0]
        punk_image = self.load_img(punk)
        for attribute in contents[1:]:
            attribute_image = self.load_img(attribute)
            punk_image.paste(attribute_image, (0, 0), attribute_image)

        return imageio.imwrite("<bytes>", np.array(punk_image), "png")

    @staticmethod
    def load_img(img: bytes) -> Image:
        # img = np.asarray(img)
        img = Image.open(io.BytesIO(img)).convert("RGBA")
        return img

    async def change_color(self, attribute: bytes, color_bytes: bytes):
        attribute_image = np.array(self.load_img(attribute))
        color_image = np.array(self.load_img(color_bytes))
        r = color_image[0][0][0]
        g = color_image[0][0][1]
        b = color_image[0][0][2]
        a = color_image[0][0][3]
        indices = np.where(np.array(attribute_image) != (255, 255, 255, 0))
        for i, j, k in zip(*indices):
            if k == 0:
                attribute_image[i, j, k] = r
            if k == 1:
                attribute_image[i, j, k] = g
            if k == 2:
                attribute_image[i, j, k] = b
            if k == 3:
                attribute_image[i, j, k] = a

        return imageio.imwrite("<bytes>", attribute_image, "png")

    async def add_number(self, image: bytes, number: str):
        punk_image = self.load_img(image)
        font = ImageFont.truetype("cryptopunk_constructor/font/PressStart2P-Regular.ttf", 5)
        draw = ImageDraw.Draw(punk_image)
        number = self.create_number(number)
        draw.text((0, 0), number, (0, 0, 0), font=font)
        return imageio.imwrite("<bytes>", np.array(punk_image), "png")

    @staticmethod
    def create_number(number):
        number = int(number)
        if number >= 1000000:
            return f'{number // 1000000}kk'
        elif number >= 1000:
            return f'{number // 1000}k'
        else:
            return str(number)
