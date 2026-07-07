-- 전라남도(JEONNAM) + 광주광역시(GWANGJU) → '전남광주(JN_GJ)' 단일 지자체로 통합

insert into public.organizations (code, name, type)
values ('JN_GJ', '전남광주', 'municipality')
on conflict (code) do nothing;

-- 두 조직에 속한 화장실이 있으면 새 조직으로 이관 (FK restrict 회피)
update public.locations set org_id = (select id from public.organizations where code = 'JN_GJ')
where org_id in (select id from public.organizations where code in ('JEONNAM','GWANGJU'));

-- 기존 두 조직 삭제
delete from public.organizations where code in ('JEONNAM','GWANGJU');
