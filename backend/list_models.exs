api_key = System.get_env("GEMINI_API_KEY")
res = Req.get!("https://generativelanguage.googleapis.com/v1beta/models?key=#{api_key}")
IO.inspect(Enum.map(res.body["models"], fn m -> m["name"] end))
