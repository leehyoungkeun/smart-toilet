-- 짧은 4자리 영숫자 페어링 코드
-- 사용(claim)하면 코드를 반납(null)해서, 짧은 코드로도 충돌 없이 재사용 가능.
-- unique 제약은 NULL 을 중복 허용하므로, 사용중(미claim) 코드끼리만 유일하면 됨.

alter table public.devices alter column pairing_code drop not null;

-- 4자리 영숫자 코드 생성 (헷갈리는 O/0/I/1/L 제외, 미사용 코드 중 유일)
create or replace function public.gen_pairing_code()
returns text language plpgsql security definer set search_path = public as $$
declare alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; n int := 0;
begin
  loop
    c := '';
    for i in 1..4 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from devices where pairing_code = c);
    n := n + 1;
    if n > 200 then raise exception 'pairing code space exhausted'; end if;
  end loop;
  return c;
end; $$;

-- 페어링 성공 시 코드 반납(null) → 재사용 가능
create or replace function public.claim_device(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_loc uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update devices
     set auth_user_id = auth.uid(), claimed_at = now(), last_seen_at = now(), pairing_code = null
   where pairing_code = p_code and auth_user_id is null
   returning id, location_id into v_id, v_loc;
  if v_id is null then raise exception 'invalid or already-claimed pairing code'; end if;
  return json_build_object('device_id', v_id, 'location_id', v_loc);
end; $$;
