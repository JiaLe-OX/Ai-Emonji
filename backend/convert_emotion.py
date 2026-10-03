import tensorflow as tf
import tf2onnx

model = tf.keras.models.load_model("weights/model.h5", compile=False)
print("input:", model.input_shape, "output:", model.output_shape)

spec = (tf.TensorSpec(model.inputs[0].shape, tf.float32, name="input"),)
tf2onnx.convert.from_keras(
    model,
    input_signature=spec,
    opset=13,
    output_path="weights/emotion-mobilenetv2-fer2013.onnx",
)
print("created weights/emotion-mobilenetv2-fer2013.onnx")
