import httpx
import os
from urllib.parse import quote

# ─── DuckDuckGo Search (مجاني 100%) ──────────────────────
async def duckduckgo_search(query: str, max_results: int = 5) -> list:
    try:
        url = f"https://api.duckduckgo.com/?q={quote(query)}&format=json&no_html=1&skip_disambig=1"
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url)
            data = response.json()
        
        results = []
        
        # Abstract (ملخص مباشر)
        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", ""),
                "snippet": data["AbstractText"],
                "url": data.get("AbstractURL", "")
            })
        
        # Related Topics
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Text", "")[:50],
                    "snippet": topic.get("Text", ""),
                    "url": topic.get("FirstURL", "")
                })
        
        return results[:max_results]

    except Exception as e:
        print(f"DuckDuckGo search error: {e}")
        return []

# ─── Format Search Results for AI ────────────────────────
def format_results_for_ai(results: list, query: str) -> str:
    if not results:
        return ""
    
    formatted = f"نتائج البحث عن: {query}\n\n"
    for i, r in enumerate(results, 1):
        formatted += f"{i}. {r.get('title', '')}\n"
        formatted += f"   {r.get('snippet', '')}\n"
        if r.get('url'):
            formatted += f"   المصدر: {r['url']}\n"
        formatted += "\n"
    
    return formatted