defmodule BoardyWeb.ProfileController do
  use BoardyWeb, :controller

  def show(conn, %{"id" => wallet_address}) do
    query = "SELECT id, wallet_address, full_name, phone_number, role, onboarding_completed FROM users WHERE wallet_address = $1 LIMIT 1"
    case Ecto.Adapters.SQL.query(Boardy.Repo, query, [wallet_address]) do
      {:ok, %{rows: [row], columns: cols}} ->
        data = Enum.zip(cols, row) |> Map.new()
        json(conn, data)
      _ ->
        conn |> put_status(404) |> json(%{error: "Not found"})
    end
  end

  def create(conn, params) do
    wallet_address = params["wallet_address"]
    full_name = params["full_name"]
    phone_number = params["phone_number"]
    role = params["role"]

    query = """
    INSERT INTO users (wallet_address, full_name, phone_number, role, onboarding_completed)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (wallet_address) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        role = EXCLUDED.role,
        onboarding_completed = true
    RETURNING id, wallet_address, full_name, phone_number, role, onboarding_completed
    """
    
    case Ecto.Adapters.SQL.query(Boardy.Repo, query, [wallet_address, full_name, phone_number, role]) do
      {:ok, %{rows: [row], columns: cols}} ->
        data = Enum.zip(cols, row) |> Map.new()
        json(conn, data)
      error ->
        IO.inspect(error, label: "DB_ERROR")
        conn |> put_status(500) |> json(%{error: "Database error", details: inspect(error)})
    end
  end
end
