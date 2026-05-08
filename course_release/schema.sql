-- Create profiles table (links to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  website text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create courses table
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  video_url text, -- The main course video (paid/registered only)
  demo_url text, -- The publicly available demo video
  price numeric default 0,
  is_free boolean default false,
  category text,
  instructor text,
  duration text,
  rating numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for courses
alter table public.courses enable row level security;

create policy "Courses are viewable by everyone."
  on courses for select
  using ( true );

-- Create enrollments table
create table public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  course_id uuid references public.courses on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, course_id)
);

-- Enable RLS for enrollments
alter table public.enrollments enable row level security;

create policy "Users can view their own enrollments."
  on enrollments for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own enrollments."
  on enrollments for insert
  with check ( auth.uid() = user_id );

-- Function to handle new user signup (auto-create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA (Optional: Run this to populate initial courses)
insert into public.courses (title, description, thumbnail_url, price, is_free, category, demo_url)
values
('Full Stack Web Development', 'Master web dev from scratch.', 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&w=400', 499, false, 'Development', 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
('Python for Beginners', 'Learn Python in 10 hours.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=400', 0, true, 'Programming', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
