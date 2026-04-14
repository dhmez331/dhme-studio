import asyncio
from typing import Optional

# ─── Collaboration Modes ──────────────────────────────────
# compete  = كل نموذج يعطي نتيجته، المستخدم يختار
# collaborate = النماذج تتشاور وتخرج نتيجة واحدة مدمجة

# ─── Chat Collaboration ───────────────────────────────────
async def collaborate_chat(
    messages: list,
    mode: str = "compete",
    providers: list = None,
    system_prompt: str = None
) -> dict:
    """
    mode: 'compete' أو 'collaborate'
    providers: ['gemini', 'groq'] أو نماذج محددة
    """
    from services.gemini import gemini_chat, gemini_chat_multi
    from services.groq_service import groq_chat, groq_chat_multi

    if providers is None:
        providers = ["gemini_flash", "groq_llama", "groq_qwen"]

    # ─── وضع المنافسة — كل نموذج يجاوب لوحده ─────────────
    if mode == "compete":
        results = {}

        async def get_response(provider):
            try:
                if provider == "gemini_flash":
                    r = await gemini_chat(messages, "flash", system_prompt)
                    return "Gemini 2.0 Flash", r
                elif provider == "gemini_pro":
                    r = await gemini_chat(messages, "pro", system_prompt)
                    return "Gemini 1.5 Pro", r
                elif provider == "gemini_thinking":
                    r = await gemini_chat(messages, "thinking", system_prompt)
                    return "Gemini Thinking", r
                elif provider == "groq_llama":
                    r = await groq_chat(messages, "llama", system_prompt)
                    return "Llama 3.3 70B", r
                elif provider == "groq_deepseek":
                    r = await groq_chat(messages, "deepseek", system_prompt)
                    return "DeepSeek R1", r
                elif provider == "groq_qwen":
                    r = await groq_chat(messages, "qwen", system_prompt)
                    return "Qwen QwQ 32B", r
                else:
                    return provider, "نموذج غير معروف"
            except Exception as e:
                return provider, f"خطأ: {str(e)}"

        tasks = [get_response(p) for p in providers]
        responses = await asyncio.gather(*tasks)

        return {
            "mode": "compete",
            "results": {name: response for name, response in responses}
        }

    # ─── وضع التعاون — نتيجة واحدة مدمجة ─────────────────
    elif mode == "collaborate":
        # الخطوة 1: نجمع ردود من كل النماذج
        compete_result = await collaborate_chat(
            messages, "compete", providers, system_prompt
        )
        individual_responses = compete_result["results"]

        # الخطوة 2: Gemini يدمج الردود في إجابة واحدة
        merge_prompt = f"""أنت محرر ذكي. لديك إجابات من عدة نماذج ذكاء اصطناعي على نفس السؤال.
مهمتك: اقرأ كل الإجابات واستخرج أفضل ما فيها في إجابة واحدة متكاملة.

السؤال الأصلي: {messages[-1]['content']}

إجابات النماذج:
"""
        for model_name, response in individual_responses.items():
            merge_prompt += f"\n### {model_name}:\n{response}\n"

        merge_prompt += "\nاكتب الإجابة المدمجة النهائية:"

        from services.gemini import gemini_chat
        merged = await gemini_chat(
            [{"role": "user", "content": merge_prompt}],
            model="flash"
        )

        return {
            "mode": "collaborate",
            "merged_response": merged,
            "individual_responses": individual_responses
        }

# ─── Image Collaboration ──────────────────────────────────
async def collaborate_image(
    prompt: str,
    mode: str = "compete",
    enhance_prompt: bool = True
) -> dict:
    """
    توليد صور من عدة نماذج
    mode: 'compete' = كل نموذج يولد صورته
          'collaborate' = نموذج نصي يحسّن البرومبت أولاً
    """
    from services.huggingface import generate_image
    from services.gemini import gemini_chat

    final_prompt = prompt

    # تحسين البرومبت دائماً قبل التوليد
    if enhance_prompt:
        enhance_msg = [{"role": "user", "content": f"""
حوّل هذا الوصف لبرومبت احترافي لتوليد صور بالإنجليزية.
أضف تفاصيل: الإضاءة، الأسلوب، الجودة، التكوين.
الوصف: {prompt}
أعطني البرومبت فقط بدون شرح.
"""}]
        final_prompt = await gemini_chat(enhance_msg, model="flash")

    if mode == "compete":
        # كل نموذج يولد صورته
        results = {}

        async def gen_flux_schnell():
            try:
                img = await generate_image(final_prompt, "flux_schnell")
                return "FLUX.1 Schnell", img
            except Exception as e:
                return "FLUX.1 Schnell", None

        async def gen_flux_dev():
            try:
                img = await generate_image(final_prompt, "flux_dev")
                return "FLUX.1 Dev", img
            except Exception as e:
                return "FLUX.1 Dev", None

        async def gen_sdxl():
            try:
                img = await generate_image(final_prompt, "sdxl")
                return "Stable Diffusion XL", img
            except Exception as e:
                return "Stable Diffusion XL", None

        tasks = [gen_flux_schnell(), gen_flux_dev(), gen_sdxl()]
        responses = await asyncio.gather(*tasks)

        return {
            "mode": "compete",
            "enhanced_prompt": final_prompt,
            "original_prompt": prompt,
            "images": {name: img for name, img in responses if img}
        }

    elif mode == "collaborate":
        # Gemini يحسّن البرومبت + FLUX يولد الصورة النهائية
        try:
            img = await generate_image(final_prompt, "flux_dev")
            return {
                "mode": "collaborate",
                "enhanced_prompt": final_prompt,
                "original_prompt": prompt,
                "image": img
            }
        except Exception as e:
            raise Exception(f"Collaborate image error: {str(e)}")

# ─── Search Collaboration ─────────────────────────────────
async def collaborate_search(
    query: str,
    messages: list = None
) -> dict:
    """
    البحث + تحليل النتائج بنموذجين مختلفين
    """
    from services.search import duckduckgo_search, format_results_for_ai
    from services.gemini import gemini_chat
    from services.groq_service import groq_chat

    # الخطوة 1: البحث
    search_results = await duckduckgo_search(query, max_results=8)
    search_context = format_results_for_ai(search_results, query)

    system = f"استخدم نتائج البحث التالية للإجابة:\n{search_context}"
    msgs = messages or [{"role": "user", "content": query}]

    # الخطوة 2: نموذجان يحللان النتائج
    async def analyze_gemini():
        return await gemini_chat(msgs, "flash", system)

    async def analyze_groq():
        return await groq_chat(msgs, "qwen", system)

    gemini_r, groq_r = await asyncio.gather(analyze_gemini(), analyze_groq())

    # الخطوة 3: Gemini يدمج التحليلين
    merge_msg = [{"role": "user", "content": f"""
دمج هذين التحليلين في إجابة واحدة شاملة عن: {query}

التحليل الأول (Gemini): {gemini_r}

التحليل الثاني (Qwen): {groq_r}

اكتب إجابة مدمجة نهائية:
"""}]

    merged = await gemini_chat(merge_msg, "flash")

    return {
        "query": query,
        "search_results": search_results,
        "gemini_analysis": gemini_r,
        "qwen_analysis": groq_r,
        "merged_answer": merged
    }