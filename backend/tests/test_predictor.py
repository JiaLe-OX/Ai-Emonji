from io import BytesIO

from PIL import Image

from app.predictor import predict_image


def image_bytes(fmt: str = "PNG") -> bytes:
    output = BytesIO()
    Image.new("RGB", (800, 600), "#f4efe8").save(output, format=fmt)
    return output.getvalue()


def test_predict_returns_spec_shape():
    result = predict_image(image_bytes())
    assert result.image.width == 800
    assert result.faces[0].id == "face-001"
    assert result.faces[0].emotion == "happy"
    assert result.faces[0].bbox.width > 0


def test_invalid_bytes_are_rejected():
    try:
        predict_image(b"not-an-image")
    except ValueError as error:
        assert str(error) == "INVALID_IMAGE"
    else:
        raise AssertionError("invalid image should fail")
