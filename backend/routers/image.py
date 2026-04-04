from fastapi import UploadFile, File, Form
from services.gemini import gemini_edit_image

@router.post("/edit")
async def edit_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    model: str = Form(default="flux_dev"),
    user: dict = Depends(verify_token)
):
    """رفع صورة + تعديلها"""
    try:
        image_data = await file.read()

        # Gemini يحلل الصورة ويولد برومبت للتعديل
        edit_result = await gemini_edit_image(image_data, prompt)

        lines = edit_result.strip().split('\n')
        image_prompt = lines[-1].replace("PROMPT:", "").strip()
        if not image_prompt or len(image_prompt) < 10:
            image_prompt = prompt

        # FLUX يولد الصورة المعدّلة
        new_image = await generate_image(image_prompt, model)
        img_b64 = base64.b64encode(new_image).decode()

        return JSONResponse({
            "original_prompt": prompt,
            "enhanced_prompt": image_prompt,
            "analysis": edit_result,
            "image_b64": img_b64
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))